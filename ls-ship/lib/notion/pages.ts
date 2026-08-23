import "server-only";
import { Client } from "@notionhq/client";

export interface NotionPageOption {
  id: string;
  title: string;
}

function extractTitle(properties: Record<string, unknown>): string {
  for (const value of Object.values(properties)) {
    if (
      value &&
      typeof value === "object" &&
      "type" in value &&
      (value as { type?: string }).type === "title"
    ) {
      const parts =
        (value as { title?: { plain_text?: string }[] }).title ?? [];
      const text = parts.map((part) => part.plain_text ?? "").join("").trim();
      if (text) return text;
    }
  }
  return "Untitled page";
}

// Lists pages the user has shared with the integration. Sharing is Notion's
// own security model — the integration physically cannot see unshared pages.
export async function listSharedPages(
  accessToken: string
): Promise<NotionPageOption[]> {
  const notion = new Client({ auth: accessToken });

  const response = await notion.search({
    filter: { property: "object", value: "page" },
    page_size: 50,
  });

  return response.results
    .filter((result) => result.object === "page")
    .map((result) => {
      const page = result as Extract<
        typeof result,
        { properties?: Record<string, unknown> }
      >;
      return {
        id: page.id,
        title: page.properties
          ? extractTitle(page.properties as Record<string, unknown>)
          : "Untitled page",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
