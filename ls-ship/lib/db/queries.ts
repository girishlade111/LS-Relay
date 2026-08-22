import "server-only";
import { randomBytes } from "crypto";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { decrypt, encrypt } from "../crypto";
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

export type IntegrationRow = typeof integrations.$inferSelect;

export async function listIntegrations(userId: string): Promise<IntegrationRow[]> {
  return db.select().from(integrations).where(eq(integrations.userId, userId));
}

export async function updateIntegrationMetadata(
  userId: string,
  provider: IntegrationProviderValue,
  patch: Record<string, unknown>
): Promise<void> {
  const [existing] = await db
    .select({ id: integrations.id, metadata: integrations.metadata })
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.provider, provider))
    )
    .limit(1);

  if (!existing) {
    return;
  }

  await db
    .update(integrations)
    .set({ metadata: { ...existing.metadata, ...patch } })
    .where(eq(integrations.id, existing.id));
}

export interface RepoListItem {
  id: string;
  owner: string;
  name: string;
  defaultBaseBranch: string | null;
  active: boolean;
  createdAt: Date;
}

// Deliberately excludes `webhookSecret` — even encrypted, it has no reason to
// leave the server.
export async function getReposForUser(userId: string): Promise<RepoListItem[]> {
  return db
    .select({
      id: repos.id,
      owner: repos.owner,
      name: repos.name,
      defaultBaseBranch: repos.defaultBaseBranch,
      active: repos.active,
      createdAt: repos.createdAt,
    })
    .from(repos)
    .where(eq(repos.userId, userId))
    .orderBy(desc(repos.createdAt));
}

export type CreatedRepo = RepoListItem;

export interface CreateRepoResult {
  repo: CreatedRepo;
  // Plaintext secret, returned exactly once so the UI can show setup
  // instructions. Only the encrypted value is persisted and it is never
  // decrypted for display again — webhook verification decrypts internally.
  plaintextWebhookSecret: string;
}

export async function createRepo(
  userId: string,
  owner: string,
  name: string,
  defaultBaseBranch?: string
): Promise<CreateRepoResult> {
  const webhookSecret = randomBytes(32).toString("hex");

  const [row] = await db
    .insert(repos)
    .values({
      userId,
      owner,
      name,
      defaultBaseBranch: defaultBaseBranch ?? null,
      webhookSecret: encrypt(webhookSecret),
    })
    .returning();

  return {
    repo: {
      id: row.id,
      owner: row.owner,
      name: row.name,
      defaultBaseBranch: row.defaultBaseBranch,
      active: row.active,
      createdAt: row.createdAt,
    },
    plaintextWebhookSecret: webhookSecret,
  };
}

// Both mutations are scoped by repoId AND userId — a repoId alone must never
// be trusted from the client, since any user could otherwise guess/iterate ids.
async function mutateOwnedRepo(
  repoId: string,
  userId: string,
  run: () => Promise<unknown>
): Promise<boolean> {
  const [match] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(and(eq(repos.id, repoId), eq(repos.userId, userId)))
    .limit(1);

  if (!match) {
    return false;
  }

  await run();
  return true;
}

export async function toggleRepoActive(
  repoId: string,
  userId: string,
  active: boolean
): Promise<boolean> {
  return mutateOwnedRepo(repoId, userId, () =>
    db.update(repos).set({ active }).where(eq(repos.id, repoId))
  );
}

export async function deleteRepo(repoId: string, userId: string): Promise<boolean> {
  return mutateOwnedRepo(repoId, userId, () =>
    db.delete(repos).where(eq(repos.id, repoId))
  );
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
