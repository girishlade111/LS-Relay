"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { updateIntegrationMetadata } from "@/lib/db/queries";

// Accepts a bare channel ID or a full copied link like
// https://team.slack.com/archives/C0123ABCD9/p1234 — the ID is extracted.
export async function saveChannelId(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const raw = String(formData.get("value") ?? "");
  const match = raw.match(/\bC[A-Z0-9]{8,}\b/i);
  if (!match) redirect("/integrations?error=invalid_channel");

  await updateIntegrationMetadata(userId, "slack", { channelId: match[0] });
  revalidatePath("/integrations");
  redirect("/integrations?saved=slack");
}

// Accepts a bare 32-char block/page ID or the whole Notion page URL.
export async function saveBlockId(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const raw = String(formData.get("value") ?? "");
  const match = raw.match(/\b([0-9a-f]{32})\b/i);
  if (!match) redirect("/integrations?error=invalid_block");

  await updateIntegrationMetadata(userId, "notion", { blockId: match[1] });
  revalidatePath("/integrations");
  redirect("/integrations?saved=notion");
}
