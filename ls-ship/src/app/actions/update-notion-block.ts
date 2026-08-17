"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates the Notion block ID in the integrations metadata.
 * This is used after connecting Notion to specify which page/block to append logs to.
 */
export async function updateNotionBlockId(blockId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate blockId format (Notion block IDs are 36-char UUIDs without hyphens or with hyphens)
  if (!blockId || !/^[a-f0-9]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(blockId)) {
    throw new Error("Invalid Notion block ID format");
  }

  // Update the integration record to set the blockId in metadata
  await db
    .update(integrations)
    .set({
      metadata: {
        blockId,
      },
    })
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, "notion"))
    );

  return { success: true };
}
