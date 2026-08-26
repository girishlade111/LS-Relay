import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";
import { clearOAuthState, isOAuthStateValid } from "@/lib/oauth/state";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

// GitHub OAuth App access tokens do not expire by default and GitHub issues no
// refresh_token, so — unlike Jira — there is no refresh flow to implement. If
// a user revokes authorization on github.com, API calls simply start returning
// 401 and they must reconnect through /api/integrations/github/connect.
interface GithubTokenResponse {
  access_token?: string;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const { userId } = await auth();

  // The state nonce must match the httpOnly cookie set during /connect —
  // this proves the callback belongs to the browser that started the flow.
  if (!userId || !code || !isOAuthStateValid(request, "github")) {
    return finishWith(url, "/integrations?error=oauth_state");
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return finishWith(url, "/integrations?error=not_configured");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  let tokenData: GithubTokenResponse;
  try {
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
        redirect_uri: new URL(
          "/api/integrations/github/callback",
          origin
        ).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    tokenData = (await tokenResponse.json()) as GithubTokenResponse;
  } catch {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  if (!tokenData.access_token) {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  await upsertIntegration(userId, "github", {
    encryptedAccessToken: encrypt(tokenData.access_token),
  });

  return finishWith(url, "/integrations?success=github");
}

// Every exit path clears the one-time state cookie so a stale nonce can never
// validate a later attempt.
function finishWith(url: URL, redirectTo: string): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, url));
  clearOAuthState(response, "github");
  return response;
}
