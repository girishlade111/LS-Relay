import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { encrypt } from "@/lib/crypto";
import { upsertIntegration } from "@/lib/db/queries";
import { clearOAuthState, isOAuthStateValid } from "@/lib/oauth/state";

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

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const { userId } = await auth();

  // The state nonce must match the httpOnly cookie set during /connect.
  if (!userId || !code || !isOAuthStateValid(request, "jira")) {
    return finishWith(url, "/integrations?error=jira_state");
  }

  if (!process.env.JIRA_CLIENT_ID || !process.env.JIRA_CLIENT_SECRET) {
    return finishWith(url, "/integrations?error=not_configured");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = new URL(
    "/api/integrations/jira/callback",
    origin
  ).toString();

  let tokens: AtlassianTokenResponse;
  try {
    tokens = await exchangeCodeForTokens(code, redirectUri);
  } catch {
    return finishWith(url, "/integrations?error=token_exchange");
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    return finishWith(url, "/integrations?error=token_exchange");
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
    return finishWith(url, "/integrations?error=sites_lookup");
  }

  if (!cloudId) {
    return finishWith(url, "/integrations?error=no_jira_sites");
  }

  await upsertIntegration(userId, "jira", {
    encryptedAccessToken: encrypt(tokens.access_token),
    encryptedRefreshToken: encrypt(tokens.refresh_token),
    metadata: {
      cloudId,
      // Jira access tokens live ~1 hour; lib/jira/session.ts consumes this
      // timestamp to refresh transparently before expiry.
      expiresAt:
        typeof tokens.expires_in === "number"
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined,
    },
  });

  return finishWith(url, "/integrations?success=jira");
}

function finishWith(url: URL, redirectTo: string): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, url));
  clearOAuthState(response, "jira");
  return response;
}
