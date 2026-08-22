import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const integrationProvider = pgEnum("integrationProvider", [
  "github",
  "jira",
  "slack",
  "notion",
]);

export const webhookEventStatus = pgEnum("webhookEventStatus", [
  "received",
  "invalid",
  "pr_created",
  "pr_exists",
  "task_updated",
  "skipped",
  "error",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // Global fallback when a commit requests a PR without naming a base branch
  // and the repo has no override of its own.
  defaultBaseBranch: text("defaultBaseBranch"),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: integrationProvider("provider").notNull(),
  // Encrypted values — never stored or handled in plaintext.
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const repos = pgTable("repos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  // Encrypted value used to verify GitHub webhook HMAC signatures.
  webhookSecret: text("webhookSecret").notNull(),
  defaultBaseBranch: text("defaultBaseBranch"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhookEvents", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repoId")
    .notNull()
    .references(() => repos.id, { onDelete: "cascade" }),
  jiraKey: text("jiraKey"),
  commands: jsonb("commands").$type<string[]>().default([]).notNull(),
  baseBranch: text("baseBranch"),
  pushBranch: text("pushBranch").notNull(),
  status: webhookEventStatus("status").notNull(),
  prUrl: text("prUrl"),
  errorMessage: text("errorMessage"),
  rawPayload: jsonb("rawPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
