import { db } from "./client";
import { users } from "./schema";

export async function ensureUserSynced(
  clerkUserId: string,
  email: string
): Promise<void> {
  await db
    .insert(users)
    .values({ id: clerkUserId, email })
    .onConflictDoNothing({ target: users.id });
}
