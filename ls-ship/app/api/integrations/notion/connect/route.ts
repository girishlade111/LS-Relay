import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { bindOAuthState, createOAuthState } from "@/lib/oauth/state";

const NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const CALLBACK_PATH = "/api/integrations/notion/callback";

export async function GET(request: Request) {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Notion OAuth is not configured" },
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
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    response_type: "code",
    owner: "user",
    state: createOAuthState(),
  });

  const response = NextResponse.redirect(
    `${NOTION_AUTHORIZE_URL}?${authorizeParams}`
  );
  bindOAuthState(response, "notion", authorizeParams.get("state") ?? "");

  return response;
}
