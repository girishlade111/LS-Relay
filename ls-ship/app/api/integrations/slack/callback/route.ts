import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";
import { clearOAuthState, isOAuthStateValid } from "@/lib/oauth/state";

const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

// Like the rest of Slack's Web API, oauth.v2.access answers HTTP 200 with an
// `ok` field instead of using status codes for failures.
interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string; // bot token (xoxb-…)
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const { userId } = await auth();

  // The state nonce must match the httpOnly cookie set during /connect.
  if (!userId || !code || !isOAuthStateValid(request, "slack")) {
    return finishWith(url, "/integrations?error=slack_state");
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return finishWith(url, "/integrations?error=not_configured");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  let data: SlackOAuthResponse;
  try {
    const response = await fetch(SLACK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL(
          "/api/integrations/slack/callback",
          origin
        ).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    data = (await response.json()) as SlackOAuthResponse;
  } catch {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  if (!data.ok || !data.access_token) {
    return finishWith(
      url,
      `/integrations?error=${encodeURIComponent(data.error ?? "token_exchange")}`
    );
  }

  // The channel a bot posts into is chosen later by the user on the
  // integrations page. Metadata is deliberately omitted so a reconnect
  // refreshes only the token and never wipes a saved channelId.
  await upsertIntegration(userId, "slack", {
    encryptedAccessToken: encrypt(data.access_token),
  });

  return finishWith(url, "/integrations?success=slack");
}

function finishWith(url: URL, redirectTo: string): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, url));
  clearOAuthState(response, "slack");
  return response;
}
