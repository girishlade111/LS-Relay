import { afterEach, describe, expect, it, vi } from "vitest";
import { listSlackChannels } from "@/lib/slack/channels";

interface Page {
  ok: boolean;
  channels?: { id: string; name: string; is_archived?: boolean }[];
  response_metadata?: { next_cursor?: string };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listSlackChannels", () => {
  it("follows pagination cursors until exhausted", async () => {
    const requestedCursors: string[] = [];
    const pages: Page[] = [
      {
        ok: true,
        channels: [
          { id: "C1", name: "general" },
          { id: "C2", name: "random", is_archived: false },
        ],
        response_metadata: { next_cursor: "cursor-1" },
      },
      {
        ok: true,
        channels: [{ id: "C3", name: "dev" }],
        response_metadata: { next_cursor: "" },
      },
    ];
    let page = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL) => {
        const url = new URL(String(input));
        requestedCursors.push(url.searchParams.get("cursor") ?? "");
        return Promise.resolve(jsonResponse(pages[page++] ?? { ok: true }));
      })
    );

    const channels = await listSlackChannels("xoxb-token");

    expect(requestedCursors).toEqual(["", "cursor-1"]);
    expect(channels.map((channel) => channel.id)).toEqual(["C3", "C1", "C2"]);
  });

  it("filters archived channels and sorts alphabetically", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({
            ok: true,
            channels: [
              { id: "CB", name: "zeta" },
              { id: "CA", name: "alpha", is_archived: true },
              { id: "CC", name: "Beta" },
            ],
          })
        )
      )
    );

    const channels = await listSlackChannels("xoxb-token");

    expect(channels.map((channel) => channel.name)).toEqual(["Beta", "zeta"]);
  });

  it("throws the Slack error string when ok is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(jsonResponse({ ok: false, error: "missing_scope" }))
      )
    );

    await expect(listSlackChannels("xoxb-token")).rejects.toThrow(
      "missing_scope"
    );
  });
});
