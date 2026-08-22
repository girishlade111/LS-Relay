import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "./client";
import { repos, users, webhookEventStatus, webhookEvents } from "./schema";

export type WebhookEventStatusValue = (typeof webhookEventStatus.enumValues)[number];

export async function ensureUserSynced(
  clerkUserId: string,
  email: string
): Promise<void> {
  await db
    .insert(users)
    .values({ id: clerkUserId, email })
    .onConflictDoNothing({ target: users.id });
}

export async function countRepos(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(repos)
    .where(eq(repos.userId, userId));

  return row?.total ?? 0;
}

export async function countActiveRepos(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(repos)
    .where(and(eq(repos.userId, userId), eq(repos.active, true)));

  return row?.total ?? 0;
}

export interface StatusCount {
  status: WebhookEventStatusValue;
  total: number;
}

export async function countEventsByStatusSince(
  userId: string,
  since: Date
): Promise<StatusCount[]> {
  return db
    .select({ status: webhookEvents.status, total: count() })
    .from(webhookEvents)
    .innerJoin(repos, eq(webhookEvents.repoId, repos.id))
    .where(and(eq(repos.userId, userId), gte(webhookEvents.createdAt, since)))
    .groupBy(webhookEvents.status);
}

export interface RecentEventRow {
  id: string;
  repoName: string;
  jiraKey: string | null;
  status: WebhookEventStatusValue;
  createdAt: Date;
}

export async function listRecentEvents(
  userId: string,
  limit = 5
): Promise<RecentEventRow[]> {
  return db
    .select({
      id: webhookEvents.id,
      repoName: repos.name,
      jiraKey: webhookEvents.jiraKey,
      status: webhookEvents.status,
      createdAt: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .innerJoin(repos, eq(webhookEvents.repoId, repos.id))
    .where(eq(repos.userId, userId))
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit);
}
