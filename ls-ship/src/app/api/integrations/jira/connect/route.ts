import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * GET handler for Jira OAuth 2.0 (3LO) connect flow.
 * 
 * Redirects the logged-in user to Atlassian's authorize URL.
 * Uses a signed state parameter containing the Clerk user ID to prevent CSRF attacks.
 * 
 * Scopes: read:jira-work, write:jira-work, offline_access
 * Audience: api.atlassian.com
 * Prompt: consent (to ensure we get a refresh token)
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: JIRA_CLIENT_ID");
  }

  const redirectUri = process.env.JIRA_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: JIRA_REDIRECT_URI");
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

  const atlassianAuthUrl = new URL("https://auth.atlassian.com/authorize");
  atlassianAuthUrl.searchParams.set("client_id", clientId);
  atlassianAuthUrl.searchParams.set(
    "scope",
    "read:jira-work write:jira-work offline_access"
  );
  atlassianAuthUrl.searchParams.set("redirect_uri", redirectUri);
  atlassianAuthUrl.searchParams.set("audience", "api.atlassian.com");
  atlassianAuthUrl.searchParams.set("prompt", "consent");
  atlassianAuthUrl.searchParams.set("response_type", "code");
  atlassianAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(atlassianAuthUrl.toString());
}
