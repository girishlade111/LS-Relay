import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * GET handler for Notion OAuth 2.0 callback.
 * 
 * Receives `code` and `state` query params from Notion.
 * Exchanges the code for access_token via POST to Notion's oauth/token endpoint.
 * Uses Basic auth header with base64-encoded client_id:client_secret per Notion's docs.
 * Encrypts the access_token and upserts into the integrations table with provider="notion".
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
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: NOTION_CLIENT_ID");
  }

  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing env var: NOTION_CLIENT_SECRET");
  }

  const redirectUri = process.env.NOTION_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: NOTION_REDIRECT_URI");
  }

  // Notion requires Basic auth with base64-encoded client_id:client_secret
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
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

  // Encrypt the token
  const encryptedAccessToken = encrypt(accessToken);

  // Upsert the integration record with empty metadata (blockId will be set by user later)
  await db
    .insert(integrations)
    .values({
      userId: authUserId,
      provider: "notion",
      accessToken: encryptedAccessToken,
      metadata: {},
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.provider],
      set: {
        accessToken: encryptedAccessToken,
      },
    });

  // Redirect to integrations page with success param
  return NextResponse.redirect(new URL("/integrations?success=true", request.url));
}
