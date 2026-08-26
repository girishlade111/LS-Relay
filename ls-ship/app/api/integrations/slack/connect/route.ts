import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { bindOAuthState, createOAuthState } from "@/lib/oauth/state";

const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const CALLBACK_PATH = "/api/integrations/slack/callback";

export async function GET(request: Request) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Slack OAuth is not configured" },
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
    // `chat:write` posts messages; `channels:read` / `groups:read` power the
    // conversations.list dropdown on the Integrations page — without them the
    // call fails with missing_scope and users must paste IDs manually.
    scope: "chat:write,channels:read,groups:read",
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    state: createOAuthState(),
  });

  const response = NextResponse.redirect(
    `${SLACK_AUTHORIZE_URL}?${authorizeParams}`
  );
  bindOAuthState(response, "slack", authorizeParams.get("state") ?? "");

  return response;
}
