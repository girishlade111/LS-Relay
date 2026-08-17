import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * GET handler for Jira OAuth 2.0 (3LO) callback.
 * 
 * Receives `code` and `state` query params from Atlassian.
 * Exchanges the code for access_token + refresh_token via POST to Atlassian's token endpoint.
 * Fetches the user's accessible Jira sites to get the cloudId.
 * Encrypts both tokens and upserts into the integrations table with provider="jira".
 */
export async function GET(request: Request) {
  const { userId: authUserId } = await auth();

  if (!authUserId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return new NextResponse("Missing code parameter", { status: 400 });
  }

  if (!state) {
    return new NextResponse("Missing state parameter", { status: 400 });
  }

  // Verify the state parameter to prevent CSRF attacks
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("Missing env var: ENCRYPTION_KEY");
  }

  const [stateUserId, stateSignature] = state.split(":");
  if (!stateUserId || !stateSignature) {
    return new NextResponse("Invalid state format", { status: 400 });
  }

  // Verify the signature matches the user ID
  const keyBuffer = Buffer.from(encryptionKey, "base64");
  const hmac = crypto.createHmac("sha256", keyBuffer);
  hmac.update(stateUserId);
  const expectedSignature = hmac.digest("hex");

  if (stateUserId !== authUserId || stateSignature !== expectedSignature) {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  // Exchange code for tokens
  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: JIRA_CLIENT_ID");
  }

  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing env var: JIRA_CLIENT_SECRET");
  }

  const redirectUri = process.env.JIRA_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: JIRA_REDIRECT_URI");
  }

  const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text().catch(() => "[unable to read response]");
    return new NextResponse(`Failed to exchange code for token: ${errorBody}`, { status: 500 });
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return new NextResponse("No access token in response", { status: 500 });
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;

  // Fetch accessible resources to get the cloudId
  const resourcesResponse = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!resourcesResponse.ok) {
    const errorBody = await resourcesResponse.text().catch(() => "[unable to read response]");
    return new NextResponse(`Failed to fetch accessible resources: ${errorBody}`, { status: 500 });
  }

  const resources = await resourcesResponse.json() as Array<{ id: string; name: string }>;

  if (!resources || resources.length === 0) {
    return new NextResponse("No accessible Jira resources found", { status: 500 });
  }

  // Take the first result's id as cloudId
  const cloudId = resources[0].id;

  // Encrypt the tokens
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = encrypt(refreshToken);

  // Upsert the integration record with metadata containing cloudId
  await db
    .insert(integrations)
    .values({
      userId: authUserId,
      provider: "jira",
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      metadata: {
        cloudId,
      },
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        metadata: {
          cloudId,
        },
      },
    });

  // Redirect to integrations page with success param
  return NextResponse.redirect(new URL("/integrations?success=true", request.url));
}
