/**
 * Posts a message to a Slack channel using the chat.postMessage API.
 * 
 * @param accessToken - Slack bot access token (xoxb-...)
 * @param channelId - The Slack channel ID (e.g., C0123456789)
 * @param text - The message text to send
 * @throws Error if Slack API returns ok: false
 */
export async function postSlackMessage(
  accessToken: string,
  channelId: string,
  text: string
): Promise<void> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
    }),
  });

  const data = await response.json();

  // Slack's API always returns HTTP 200 even on failure — check the ok field
  if (!data.ok) {
    throw new Error(data.error || "Failed to post Slack message");
  }
}
