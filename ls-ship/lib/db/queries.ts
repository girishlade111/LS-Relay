import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "./client";
import {
  integrations,
  integrationProvider,
  repos,
  users,
  webhookEventStatus,
  webhookEvents,
} from "./schema";

export type WebhookEventStatusValue = (typeof webhookEventStatus.enumValues)[number];
export type IntegrationProviderValue = (typeof integrationProvider.enumValues)[number];

export async function ensureUserSynced(
  clerkUserId: string,
  email: string
): Promise<void> {
  await db
    .insert(users)
    .values({ id: clerkUserId, email })
    .onConflictDoNothing({ target: users.id });
}

export interface IntegrationCredentials {
  encryptedAccessToken: string;
  encryptedRefreshToken?: string | null;
  metadata?: Record<string, unknown>;
}

export async function upsertIntegration(
  userId: string,
  provider: IntegrationProviderValue,
  credentials: IntegrationCredentials
): Promise<void> {
  // `integrations` has no unique index on (userId, provider), so a native
  // onConflictDoUpdate isn't possible yet — resolve the existing row manually.
  // Adding that index would turn this into one atomic upsert statement.
  const [existing] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, provider))
    )
    .limit(1);

  const patch: Partial<typeof integrations.$inferInsert> = {
    accessToken: credentials.encryptedAccessToken,
  };
  if (credentials.encryptedRefreshToken !== undefined) {
    patch.refreshToken = credentials.encryptedRefreshToken;
  }
  if (credentials.metadata !== undefined) {
    patch.metadata = credentials.metadata;
  }

  if (existing) {
    await db
      .update(integrations)
      .set(patch)
      .where(eq(integrations.id, existing.id));
    return;
  }

  await db.insert(integrations).values({
    userId,
    provider,
    accessToken: credentials.encryptedAccessToken,
    refreshToken: credentials.encryptedRefreshToken,
    metadata: credentials.metadata,
  });
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
