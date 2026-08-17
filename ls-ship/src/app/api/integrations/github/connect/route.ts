import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * GET handler for GitHub OAuth connect flow.
 * 
 * Redirects the logged-in user to GitHub's OAuth authorize URL.
 * Uses a signed state parameter containing the Clerk user ID to prevent CSRF attacks.
 * 
 * Note: This implementation uses a GitHub OAuth App which provides user-wide tokens.
 * For production at scale, consider migrating to a GitHub App which would give
 * per-repo scoped installation tokens instead of a single user-wide token, which is
 * more secure and follows the principle of least privilege.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: GITHUB_CLIENT_ID");
  }

  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("Missing env var: GITHUB_REDIRECT_URI");
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

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("scope", "repo");
  githubAuthUrl.searchParams.set("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(githubAuthUrl.toString());
}
