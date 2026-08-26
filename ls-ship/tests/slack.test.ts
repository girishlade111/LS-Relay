import { afterEach, describe, expect, it, vi } from "vitest";
import { postSlackMessage } from "@/lib/slack/notify";
import { listSlackChannels } from "@/lib/slack/channels";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postSlackMessage", () => {
  it("sends the channel and text with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await postSlackMessage("xoxb-token", "C0123ABCD9", "hello");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer xoxb-token"
    );
    expect(JSON.parse(String(init.body))).toEqual({
      channel: "C0123ABCD9",
      text: "hello",
    });
  });

  it("throws on Slack's HTTP-200 ok:false error shape", async () => {
    // Slack returns 200 even for failures — success is only the `ok` field.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: "channel_not_found" }))
    );
    await expect(postSlackMessage("t", "C1", "hi")).rejects.toThrow(
      /channel_not_found/
    );
  });

  it("throws on non-2xx HTTP responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, 503))
    );
    await expect(postSlackMessage("t", "C1", "hi")).rejects.toThrow(/503/);
  });

  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    await expect(postSlackMessage("t", "C1", "hi")).rejects.toThrow("boom");
  });
});

describe("listSlackChannels", () => {
  it("paginates via next_cursor and filters archived channels", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        call += 1;
        if (call === 1) {
          return jsonResponse({
            ok: true,
            channels: [
              { id: "C1", name: "general" },
              { id: "C2", name: "old", is_archived: true },
            ],
            response_metadata: { next_cursor: "page-2" },
          });
        }
        expect(url).toContain("cursor=page-2");
        return jsonResponse({
          ok: true,
          channels: [{ id: "C3", name: "random" }],
        });
      })
    );

    const channels = await listSlackChannels("token");
    expect(channels.map((c) => c.id)).toEqual(["C1", "C3"]);
    expect(channels.map((c) => c.name)).toEqual(["general", "random"]); // sorted
  });

  it("throws Slack's error string when ok is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: "missing_scope" }))
    );
    await expect(listSlackChannels("token")).rejects.toThrow(/missing_scope/);
  });
});
