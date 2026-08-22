import "server-only";

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

export async function postSlackMessage(
  accessToken: string,
  channelId: string,
  text: string
): Promise<void> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ channel: channelId, text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Slack chat.postMessage failed (HTTP ${response.status})`);
  }

  // Slack's Web API returns HTTP 200 even when the call fails — success is
  // only signalled by the body's `ok` field, with the reason in `error`.
  const data = (await response.json()) as SlackApiResponse;
  if (!data.ok) {
    throw new Error(
      `Slack chat.postMessage failed: ${data.error ?? "unknown_error"}`
    );
  }
}
