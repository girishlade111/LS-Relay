"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  extractNotionPageId,
  extractSlackChannelId,
} from "@/lib/extract-ids";
import { updateIntegrationMetadata } from "@/lib/db/queries";

// Accepts a bare channel ID or a full copied link like
// https://team.slack.com/archives/C0123ABCD9/p1234 — the ID is extracted.
export async function saveChannelId(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const raw = String(formData.get("value") ?? "");
  const channelId = extractSlackChannelId(raw);
  if (!channelId) redirect("/integrations?error=invalid_channel");

  await updateIntegrationMetadata(userId, "slack", { channelId });
  revalidatePath("/integrations");
  redirect("/integrations?saved=slack");
}

// Accepts a bare 32-char block/page ID or the whole Notion page URL. Notion
// formats IDs as dashed UUIDs (8-4-4-4-12) in copied links, so dashes are
// stripped before matching.
export async function saveBlockId(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const raw = String(formData.get("value") ?? "");
  const blockId = extractNotionPageId(raw);
  if (!blockId) redirect("/integrations?error=invalid_block");

  await updateIntegrationMetadata(userId, "notion", { blockId });
  revalidatePath("/integrations");
  redirect("/integrations?saved=notion");
}
