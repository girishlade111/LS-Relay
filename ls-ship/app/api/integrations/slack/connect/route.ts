import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    scope: "chat:write",
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    state: userId,
  });

  return NextResponse.redirect(`${SLACK_AUTHORIZE_URL}?${authorizeParams}`);
}
