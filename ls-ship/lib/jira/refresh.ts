import "server-only";

interface TokenRefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface RefreshedJiraTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the new access token expires, when the provider reports it. */
  expiresInSeconds: number | null;
}

// Jira access tokens expire after 1 hour (`expires_in: 3600`), unlike GitHub's
// non-expiring OAuth App tokens. lib/jira/session.ts consumes this function to
// keep credentials fresh: it compares `metadata.expiresAt` to Date.now(),
// refreshes when needed, re-encrypts BOTH tokens and writes them back through
// upsertIntegration before the caller retries the request.
export async function refreshJiraToken(
  refreshToken: string
): Promise<RefreshedJiraTokens> {
  const clientId = process.env.JIRA_CLIENT_ID;
  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing env vars: JIRA_CLIENT_ID / JIRA_CLIENT_SECRET");
  }

  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(
      `Jira token refresh failed (${response.status}): ${
        body.length >= 500 ? `${body}…` : body
      }`
    );
  }

  const data = (await response.json()) as TokenRefreshResponse;
  if (!data.access_token) {
    throw new Error("Jira token refresh response contained no access_token");
  }

  // Atlassian rotates refresh tokens on use only sometimes; when none is
  // returned the existing one stays valid and is reused as-is.
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresInSeconds:
      typeof data.expires_in === "number" ? data.expires_in : null,
  };
}
