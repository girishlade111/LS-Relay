import { describe, expect, it } from "vitest";
import { extractNotionPageId, extractSlackChannelId } from "@/lib/extract-ids";

describe("extractSlackChannelId", () => {
  it("accepts a bare channel ID", () => {
    expect(extractSlackChannelId("C0123ABCD9")).toBe("C0123ABCD9");
  });

  it("extracts the ID from a copied channel link", () => {
    expect(
      extractSlackChannelId("https://team.slack.com/archives/C0123ABCD9/p1234")
    ).toBe("C0123ABCD9");
  });

  it("stays case-sensitive so ordinary words do not match", () => {
    expect(extractSlackChannelId("conversations")).toBeNull();
    expect(extractSlackChannelId("c0123abcd9")).toBeNull();
  });

  it("returns null for input without an ID", () => {
    expect(extractSlackChannelId("#general")).toBeNull();
    expect(extractSlackChannelId("")).toBeNull();
  });
});

describe("extractNotionPageId", () => {
  it("accepts a bare contiguous 32-hex ID", () => {
    expect(extractNotionPageId("a1b2c3d4e5f6789012345678abcdef01")).toBe(
      "a1b2c3d4e5f6789012345678abcdef01"
    );
  });

  it("extracts a dashed UUID from a full page URL", () => {
    const url =
      "https://www.notion.so/Page-Title-a1b2c3d4-e5f6-7890-1234-5678abcdef01?pvs=4";
    expect(extractNotionPageId(url)).toBe(
      "a1b2c3d4e5f6789012345678abcdef01"
    );
  });

  it("returns null when no 32-hex run exists", () => {
    expect(extractNotionPageId("https://www.notion.so/short-id")).toBeNull();
    expect(extractNotionPageId("")).toBeNull();
  });
});
