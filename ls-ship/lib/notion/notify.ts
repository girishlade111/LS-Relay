import "server-only";
import { Client } from "@notionhq/client";

// Appends one paragraph to the target page/block. The target must be shared
// with the integration (Notion only exposes pages the user explicitly added).
export async function appendNotionBlock(
  accessToken: string,
  blockId: string,
  text: string
): Promise<void> {
  const notion = new Client({ auth: accessToken });

  await notion.blocks.children.append({
    block_id: blockId,
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: text } }],
        },
      },
    ],
  });
}
