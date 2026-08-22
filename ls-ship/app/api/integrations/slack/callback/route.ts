import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";

const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

// Like the rest of Slack's Web API, oauth.v2.access answers HTTP 200 with an
// `ok` field instead of using status codes for failures.
interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string; // bot token (xoxb-…)
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { userId } = await auth();

  // `state` must equal the current session's Clerk user id (see connect route).
  if (!userId || !code || !state || state !== userId) {
    return NextResponse.redirect(new URL("/integrations?error=slack_state", url));
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/integrations?error=not_configured", url)
    );
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
        redirect_uri: new URL("/api/integrations/slack/callback", origin).toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    data = (await response.json()) as SlackOAuthResponse;
  } catch {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  if (!data.ok || !data.access_token) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${data.error ?? "token_exchange"}`, url)
    );
  }

  // The channel a bot posts into is chosen later by the user on the
  // integrations page, so metadata starts empty.
  await upsertIntegration(userId, "slack", {
    encryptedAccessToken: encrypt(data.access_token),
    metadata: {},
  });

  return NextResponse.redirect(new URL("/integrations?success=slack", url));
}
