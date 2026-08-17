import { Client } from "@notionhq/client";

/**
 * Appends a paragraph block with the given text to a Notion page/block.
 * 
 * @param accessToken - Notion integration access token
 * @param blockId - The parent block ID (usually a page ID) to append the block to
 * @param text - The text content for the paragraph block
 * @throws Error if Notion API returns an error
 */
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
        paragraph: {
          rich_text: [
            {
              text: {
                content: text,
              },
            },
          ],
        },
      },
    ],
  });
}
