import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { bindOAuthState, createOAuthState } from "@/lib/oauth/state";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const CALLBACK_PATH = "/api/integrations/github/callback";

// CSRF protection for the OAuth round-trip: `state` is a random nonce bound
// to a short-lived httpOnly cookie (see lib/oauth/state.ts). Only the browser
// that initiated the flow holds the cookie, so a callback URL captured by an
// attacker can never be replayed against someone else's session.
export async function GET(request: Request) {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth is not configured" },
      { status: 500 }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    // `repo`: read/pull private repos and create PRs.
    // `admin:repo_hook`: create/manage the push webhook automatically —
    // without it every webhook registration fails with 404/403.
    scope: "repo,admin:repo_hook",
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    state: createOAuthState(),
  });

  const response = NextResponse.redirect(
    `${GITHUB_AUTHORIZE_URL}?${authorizeParams}`
  );
  bindOAuthState(response, "github", authorizeParams.get("state") ?? "");

  return response;
}
