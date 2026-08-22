import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: new URL(CALLBACK_PATH, origin).toString(),
    response_type: "code",
    owner: "user",
    state: userId,
  });

  return NextResponse.redirect(`${NOTION_AUTHORIZE_URL}?${authorizeParams}`);
}
