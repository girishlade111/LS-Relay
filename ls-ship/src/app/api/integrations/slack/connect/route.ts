import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * GET handler for Slack OAuth 2.0 connect flow.
 * 
 * Redirects the logged-in user to Slack's authorize URL.
 * Uses a signed state parameter containing the Clerk user ID to prevent CSRF attacks.
 * 
 * Scope: chat:write (to post messages to channels)
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: SLACK_CLIENT_ID");
  }

  const redirectUri = process.env.SLACK_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: SLACK_REDIRECT_URI");
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("Missing env var: ENCRYPTION_KEY");
  }

  // Sign the state parameter with HMAC using ENCRYPTION_KEY to prevent CSRF
  // Format: userId:hmacSignature
  const keyBuffer = Buffer.from(encryptionKey, "base64");
  const hmac = crypto.createHmac("sha256", keyBuffer);
  hmac.update(userId);
  const signature = hmac.digest("hex");
  const state = `${userId}:${signature}`;

  const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackAuthUrl.searchParams.set("client_id", clientId);
  slackAuthUrl.searchParams.set("scope", "chat:write");
  slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
  slackAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(slackAuthUrl.toString());
}
