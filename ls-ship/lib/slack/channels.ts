import "server-only";

interface ConversationsListResponse {
  ok: boolean;
  error?: string;
  channels?: { id: string; name: string; is_archived?: boolean }[];
  response_metadata?: { next_cursor?: string };
}

// Lists every channel the bot can see (public workspace-wide; private ones
// only if the bot was invited). Powers the channel dropdown so users never
// have to hunt for channel IDs manually.
export async function listSlackChannels(
  accessToken: string
): Promise<{ id: string; name: string }[]> {
  const all: { id: string; name: string }[] = [];
  let cursor = "";

  do {
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      }
    );
    const data = (await response.json()) as ConversationsListResponse;

    if (!data.ok) {
      throw new Error(data.error ?? "conversations.list failed");
    }

    for (const channel of data.channels ?? []) {
      if (!channel.is_archived) {
        all.push({ id: channel.id, name: channel.name });
      }
    }
    cursor = data.response_metadata?.next_cursor ?? "";
  } while (cursor && all.length < 1000);

  all.sort((a, b) => a.name.localeCompare(b.name));
  return all;
}
