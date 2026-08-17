import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * GET handler for GitHub OAuth callback.
 * 
 * Receives `code` and `state` query params from GitHub.
 * Exchanges the code for an access_token by POSTing to GitHub's token endpoint.
 * Encrypts the access_token and upserts it into the integrations table.
 * Redirects to /integrations with a success query param.
 * 
 * Note: GitHub tokens from OAuth Apps do not expire by default, so no refresh
 * logic is needed for GitHub (unlike Jira).
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

  // Exchange code for access token
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: GITHUB_CLIENT_ID");
  }

  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing env var: GITHUB_CLIENT_SECRET");
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: GITHUB_REDIRECT_URI");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return new NextResponse("Failed to exchange code for token", { status: 500 });
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return new NextResponse("No access token in response", { status: 500 });
  }

  const accessToken = tokenData.access_token;

  // Encrypt the access token
  const encryptedToken = encrypt(accessToken);

  // Upsert the integration record
  await db
    .insert(integrations)
    .values({
      userId: authUserId,
      provider: "github",
      accessToken: encryptedToken,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        accessToken: encryptedToken,
      },
    });

  // Redirect to integrations page with success param
  return NextResponse.redirect(new URL("/integrations?success=true", request.url));
}
