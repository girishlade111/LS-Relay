import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";
import { clearOAuthState, isOAuthStateValid } from "@/lib/oauth/state";

const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

interface NotionTokenResponse {
  access_token?: string;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const { userId } = await auth();

  // The state nonce must match the httpOnly cookie set during /connect.
  if (!userId || !code || !isOAuthStateValid(request, "notion")) {
    return finishWith(url, "/integrations?error=notion_state");
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return finishWith(url, "/integrations?error=not_configured");
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
        redirect_uri: new URL(
          "/api/integrations/notion/callback",
          origin
        ).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    data = (await response.json()) as NotionTokenResponse;
  } catch {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  if (!data.access_token) {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  // The destination page/block is chosen later by the user on the integrations
  // page. Metadata is deliberately omitted so a reconnect refreshes only the
  // token and never wipes a saved blockId.
  await upsertIntegration(userId, "notion", {
    encryptedAccessToken: encrypt(data.access_token),
  });

  return finishWith(url, "/integrations?success=notion");
}

function finishWith(url: URL, redirectTo: string): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, url));
  clearOAuthState(response, "notion");
  return response;
}
