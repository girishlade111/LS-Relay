import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

interface NotionTokenResponse {
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
      new URL("/integrations?error=notion_state", url)
    );
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/integrations?error=not_configured", url)
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  // Per Notion's docs the token endpoint authenticates the integration itself
  // with HTTP Basic (base64 of client_id:client_secret), unlike Slack/Jira.
  let data: NotionTokenResponse;
  try {
    const response = await fetch(NOTION_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: new URL("/api/integrations/notion/callback", origin).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    data = (await response.json()) as NotionTokenResponse;
  } catch {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  if (!data.access_token) {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  // The destination page/block is chosen later by the user on the integrations
  // page, so metadata starts empty.
  await upsertIntegration(userId, "notion", {
    encryptedAccessToken: encrypt(data.access_token),
    metadata: {},
  });

  return NextResponse.redirect(new URL("/integrations?success=notion", url));
}
