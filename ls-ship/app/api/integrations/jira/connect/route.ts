import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { bindOAuthState, createOAuthState } from "@/lib/oauth/state";

const ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const CALLBACK_PATH = "/api/integrations/jira/callback";

// `offline_access` is what makes Atlassian issue a refresh_token — without it
// the access token would expire in an hour with no way to renew. `prompt=consent`
// forces a fresh grant so we reliably receive refresh tokens on reconnects too.
export async function GET(request: Request) {
  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Jira OAuth is not configured" },
      { status: 500 }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // Same CSRF pattern as every connect route: a random nonce bound to an
  // httpOnly cookie, verified at the callback (see lib/oauth/state.ts).
  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    scope: "read:jira-work write:jira-work offline_access",
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    state: createOAuthState(),
    response_type: "code",
    audience: "api.atlassian.com",
    prompt: "consent",
  });

  const response = NextResponse.redirect(
    `${ATLASSIAN_AUTHORIZE_URL}?${authorizeParams}`
  );
  bindOAuthState(response, "jira", authorizeParams.get("state") ?? "");

  return response;
}
