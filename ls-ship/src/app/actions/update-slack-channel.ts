"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates the Slack channel ID in the integrations metadata.
 * This is used after connecting Slack to specify which channel to post notifications to.
 */
export async function updateSlackChannelId(channelId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Validate channelId format (Slack channel IDs start with C or G followed by alphanumeric chars)
  if (!channelId || !/^C[A-Z0-9]{8,}$/.test(channelId)) {
    throw new Error("Invalid Slack channel ID format");
  }

  // Update the integration record to set the channelId in metadata
  await db
    .update(integrations)
    .set({
      metadata: {
        channelId,
      },
    })
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, "slack"))
    );

  return { success: true };
}
