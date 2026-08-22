import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const CALLBACK_PATH = "/api/integrations/github/callback";

// CSRF protection for the OAuth round-trip: `state` carries the Clerk user id
// and the callback rejects any response whose state doesn't match the user id
// of the *current* session. An attacker can initiate the flow but can never
// complete it against a victim session, since the pairing only holds when both
// values come from the same logged-in browser. A signed random nonce would
// only be needed for flows without a live session to compare against.
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
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    scope: "repo",
    state: userId,
  });

  return NextResponse.redirect(`${GITHUB_AUTHORIZE_URL}?${authorizeParams}`);
}
