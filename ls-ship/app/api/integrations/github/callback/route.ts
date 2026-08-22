import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

// GitHub OAuth App access tokens do not expire by default and GitHub issues no
// refresh_token, so — unlike Jira — there is no refresh flow to implement. If
// a user revokes authorization on github.com, API calls simply start returning
// 401 and they must reconnect through /api/integrations/github/connect.
interface GithubTokenResponse {
  access_token?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { userId } = await auth();

  // `state` must equal the current session's Clerk user id (see connect route).
  if (!userId || !code || !state || state !== userId) {
    return NextResponse.redirect(
      new URL("/integrations?error=oauth_state", url)
    );
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/integrations?error=not_configured", url)
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: new URL("/api/integrations/github/callback", origin).toString(),
    }),
  });

  const tokenData = (await tokenResponse.json()) as GithubTokenResponse;
  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  await upsertIntegration(userId, "github", {
    encryptedAccessToken: encrypt(tokenData.access_token),
  });

  return NextResponse.redirect(new URL("/integrations?success=github", url));
}
