import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * GET handler for Notion OAuth 2.0 connect flow.
 * 
 * Redirects the logged-in user to Notion's authorize URL.
 * Uses a signed state parameter containing the Clerk user ID to prevent CSRF attacks.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: NOTION_CLIENT_ID");
  }

  const redirectUri = process.env.NOTION_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: NOTION_REDIRECT_URI");
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

  const notionAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  notionAuthUrl.searchParams.set("client_id", clientId);
  notionAuthUrl.searchParams.set("redirect_uri", redirectUri);
  notionAuthUrl.searchParams.set("response_type", "code");
  notionAuthUrl.searchParams.set("owner", "user");
  notionAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(notionAuthUrl.toString());
}
