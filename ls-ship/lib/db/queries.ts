// We mirror Clerk's user into our own DB because our `integrations`, `repos`, and `webhookEvents` 
// tables need a stable foreign key that exists independent of Clerk API calls at webhook-processing time.
// This allows us to look up users by their Clerk ID without making external API calls during webhook handling.

import { db } from "./client";
import { users } from "./schema";

export async function ensureUserSynced(clerkUserId: string, email: string) {
  await db
    .insert(users)
    .values({
      id: clerkUserId,
      email,
    })
    .onConflictDoNothing({ target: users.id });
}
