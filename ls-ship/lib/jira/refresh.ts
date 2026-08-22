import "server-only";

interface TokenRefreshResponse {
  access_token?: string;
  refresh_token?: string;
}

// Jira access tokens expire after 1 hour (`expires_in: 3600`), unlike GitHub's
// non-expiring OAuth App tokens — so every Jira call site must be refresh-aware.
// The contract: store `expiresAt` (ISO timestamp) in `integrations.metadata`
// alongside cloudId; before any Jira API request, compare it to Date.now() and
// if expired call refreshJiraToken with the stored (decrypted) refresh token,
// then re-encrypt BOTH new tokens via encrypt() and write them back through
// upsertIntegration before retrying the request. This wiring happens in the
// webhook handler (Prompt 12), not here.
export async function refreshJiraToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
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
  };
}
