/**
 * Refreshes a Jira access token using a refresh token.
 * 
 * Jira access tokens expire in 1 hour, so any code calling the Jira API must check token age
 * (store an expiresAt in metadata) and call this refresh function before making a request if expired,
 * then re-encrypt and update the stored token in the DB.
 * 
 * @param refreshToken - The encrypted refresh token
 * @returns Object containing new accessToken and refreshToken (both unencrypted)
 * @throws Error if the refresh request fails
 */
export async function refreshJiraToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const clientId = process.env.JIRA_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing env var: JIRA_CLIENT_ID");
  }

  const clientSecret = process.env.JIRA_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("Missing env var: JIRA_CLIENT_SECRET");
  }

  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "[unable to read response]");
    throw new Error(`Failed to refresh Jira token: ${errorBody}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("No access token in refresh response");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use old refresh token if no new one provided
  };
}
