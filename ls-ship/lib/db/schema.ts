import { pgTable, text, timestamp, uuid, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["github", "jira", "slack", "notion"]);
export const webhookStatusEnum = pgEnum("webhook_status", [
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const repos = pgTable("repos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  defaultBaseBranch: text("default_base_branch"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id")
    .notNull()
    .references(() => repos.id, { onDelete: "cascade" }),
  jiraKey: text("jira_key"),
  commands: jsonb("commands").$type<string[]>().default([]),
  baseBranch: text("base_branch"),
  pushBranch: text("push_branch").notNull(),
  status: webhookStatusEnum("status").notNull(),
  prUrl: text("pr_url"),
  errorMessage: text("error_message"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow(),
});
