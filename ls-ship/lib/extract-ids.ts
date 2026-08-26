// Pure extraction helpers for pasted provider IDs. Kept free of server-only
// imports so they are unit-testable and reusable outside server actions.

// Slack channel IDs are uppercase `C` followed by 8+ uppercase
// alphanumeric characters (e.g. C0123ABCD9). The match must stay
// case-sensitive: with `/i`, ordinary words like "conversations" would be
// extracted as channel IDs.
const SLACK_CHANNEL_PATTERN = /\bC[A-Z0-9]{8,}\b/;

// Notion renders the same 32-hex ID both ways: contiguous ("a1b2…f01") or as
// a dashed UUID ("a1b2c3d4-e5f6-7890-1234-5678abcdef01"). The dashed form is
// matched on the ORIGINAL string — stripping dashes up front would fuse the
// ID with adjacent title words and destroy the word boundaries the regexes
// rely on (e.g. ".../My-Page-a1b2c3d4-…").
const NOTION_DASHED_PATTERN =
  /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
const NOTION_PLAIN_PATTERN = /\b([0-9a-f]{32})\b/i;

export function extractSlackChannelId(raw: string): string | null {
  return raw.match(SLACK_CHANNEL_PATTERN)?.[0] ?? null;
}

export function extractNotionPageId(raw: string): string | null {
  const dashed = raw.match(NOTION_DASHED_PATTERN);
  if (dashed) {
    return dashed[1].replace(/-/g, "").toLowerCase();
  }
  return raw.match(NOTION_PLAIN_PATTERN)?.[1]?.toLowerCase() ?? null;
}
