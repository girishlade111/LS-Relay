import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";

const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ACCESSIBLE_RESOURCES_URL =
  "https://api.atlassian.com/oauth/token/accessible-resources";

interface AtlassianTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface AccessibleResource {
  id: string;
  name: string;
}

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<AtlassianTokenResponse> {
  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`token endpoint returned ${response.status}`);
  }

  return (await response.json()) as AtlassianTokenResponse;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const { userId } = await auth();

  // `state` must equal the current session's Clerk user id (see connect route).
  if (!userId || !code || !state || state !== userId) {
    return NextResponse.redirect(new URL("/integrations?error=jira_state", url));
  }

  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/integrations?error=not_configured", url)
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = new URL("/api/integrations/jira/callback", origin).toString();

  let tokens: AtlassianTokenResponse;
  try {
    tokens = await exchangeCodeForTokens(code, redirectUri);
  } catch {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/integrations?error=token_exchange", url)
    );
  }

  // A Jira integration is per-site: resolve which cloud (site) the token can
  // reach. MVP takes the first accessible site; multi-site selection comes later.
  let cloudId: string | undefined;
  try {
    const resourcesResponse = await fetch(ACCESSIBLE_RESOURCES_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const resources = (await resourcesResponse.json()) as AccessibleResource[];
    cloudId = resources[0]?.id;
  } catch {
    return NextResponse.redirect(
      new URL("/integrations?error=sites_lookup", url)
    );
  }

  if (!cloudId) {
    return NextResponse.redirect(
      new URL("/integrations?error=no_jira_sites", url)
    );
  }

  await upsertIntegration(userId, "jira", {
    encryptedAccessToken: encrypt(tokens.access_token),
    encryptedRefreshToken: encrypt(tokens.refresh_token),
    metadata: {
      cloudId,
      // Jira access tokens live 1 hour; lib/jira/refresh.ts documents the
      // check-and-refresh contract built on this timestamp.
      expiresAt:
        typeof tokens.expires_in === "number"
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined,
    },
  });

  return NextResponse.redirect(new URL("/integrations?success=jira", url));
}
