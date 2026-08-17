import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * GET handler for Slack OAuth 2.0 callback.
 * 
 * Receives `code` and `state` query params from Slack.
 * Exchanges the code for access_token via POST to Slack's oauth.v2.access endpoint.
 * Encrypts the bot token and upserts into the integrations table with provider="slack".
 * The metadata.channelId is left unset initially - user will configure it on the integrations page.
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
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: SLACK_CLIENT_ID");
  }

  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing env var: SLACK_CLIENT_SECRET");
  }

  const redirectUri = process.env.SLACK_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: SLACK_REDIRECT_URI");
  }

  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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

  // Slack returns ok: false even with HTTP 200 on failure
  if (!tokenData.ok) {
    return new NextResponse(`Slack API error: ${tokenData.error}`, { status: 500 });
  }

  if (!tokenData.access_token) {
    return new NextResponse("No access token in response", { status: 500 });
  }

  // Get the bot access token (xoxb-...)
  const accessToken = tokenData.access_token;

  // Encrypt the token
  const encryptedAccessToken = encrypt(accessToken);

  // Upsert the integration record with empty metadata (channelId will be set by user later)
  await db
    .insert(integrations)
    .values({
      userId: authUserId,
      provider: "slack",
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
