import { NextResponse } from "next/server";
import { parsePushCommits, type GitHubPushCommit, type ParsedCommit } from "@/lib/commit-parser";
import type { WebhookEventStatusValue } from "@/lib/db/queries";
import {
  getDecryptedIntegration,
  getRepoById,
  logWebhookEvent,
  type DecryptedIntegration,
} from "@/lib/db/queries";
import { decrypt } from "@/lib/crypto";
import { getGithubClient } from "@/lib/github/client";
import { checkPRExists, createPR } from "@/lib/github/pr";
import { verifyGithubSignature } from "@/lib/github/verify-signature";
import type { JiraCreds } from "@/lib/jira/client";
import { getTask, updateTaskStatus } from "@/lib/jira/task";
import { appendNotionBlock } from "@/lib/notion/notify";
import { postSlackMessage } from "@/lib/slack/notify";

interface PushPayload {
  ref?: unknown;
  commits?: { id?: unknown; message?: unknown }[];
}

const REFS_HEADS_PREFIX = "refs/heads/";
// Transition id for "Development Done", inherited from the legacy n8n
// workflow. TODO: make this a per-repo configurable setting instead of a
// hardcoded constant — Jira workflows differ per team.
const JIRA_DONE_TRANSITION_ID = "61";

function branchFromRef(fullRef: string): string {
  return fullRef.startsWith(REFS_HEADS_PREFIX)
    ? fullRef.slice(REFS_HEADS_PREFIX.length)
    : fullRef;
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function notifySlack(
  userId: string,
  text: string
): Promise<void> {
  const slack = await getDecryptedIntegration(userId, "slack");
  if (!slack) return;
  const channelId = metadataString(slack.metadata, "channelId");
  if (!channelId) return;
  await postSlackMessage(slack.accessToken, channelId, text);
}

async function notifyNotion(userId: string, text: string): Promise<void> {
  const notion = await getDecryptedIntegration(userId, "notion");
  if (!notion) return;
  const blockId = metadataString(notion.metadata, "blockId");
  if (!blockId) return;
  await appendNotionBlock(notion.accessToken, blockId, text);
}

function notificationText(
  commit: ParsedCommit,
  status: WebhookEventStatusValue,
  prUrl: string | null,
  repoLabel: string
): string {
  if (status === "pr_created") {
    return `[LS Ship] Opened a PR for ${commit.jiraKey} on ${repoLabel}: ${prUrl ?? ""}`;
  }
  if (status === "pr_exists") {
    return `[LS Ship] PR already open for ${commit.jiraKey} on ${repoLabel}: ${prUrl ?? ""}`;
  }
  return `[LS Ship] Marked ${commit.jiraKey} as Development Done on ${repoLabel}`;
}

export async function POST(
  request: Request,
  { params }: { params: { repoId: string } }
) {
  // Signature verification must run against the exact raw bytes GitHub sent —
  // read the body as text before any JSON parsing.
  const rawBody = await request.text();

  const repo = await getRepoById(params.repoId);
  if (!repo || !repo.active) {
    // Not an error worth retrying: returning non-2xx would eventually make
    // GitHub disable the webhook entirely.
    return NextResponse.json({ ok: true, skipped: "unknown_or_inactive_repo" });
  }

  const webhookSecret = decrypt(repo.webhookSecret);
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyGithubSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 }
    );
  }

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody) as PushPayload;
  } catch {
    // Authenticated but unparseable — still must not return non-2xx.
    return NextResponse.json({ ok: true, skipped: "invalid_json" });
  }

  const ref = typeof payload.ref === "string" ? payload.ref : "";
  const pushBranch = branchFromRef(ref);
  const commits: GitHubPushCommit[] = Array.isArray(payload.commits)
    ? payload.commits.filter(
        (commit): commit is GitHubPushCommit =>
          typeof commit?.id === "string" && typeof commit?.message === "string"
      )
    : [];

  const { valid, invalid } = parsePushCommits(commits, ref);

  // Log every unparseable commit — not just the first one.
  for (const bad of invalid) {
    await logWebhookEvent({
      repoId: repo.id,
      pushBranch,
      status: "invalid",
      errorMessage: `${bad.sha.slice(0, 7)} "${bad.message.slice(0, 120)}": ${bad.reason}`,
    });
  }

  // Integrations are memoized per request so N commits in one push cost one
  // lookup each (decrypted values stay in memory only).
  let jiraPromise: Promise<DecryptedIntegration | null> | undefined;
  const loadJira = () =>
    (jiraPromise ??= getDecryptedIntegration(repo.userId, "jira"));
  let githubPromise: Promise<DecryptedIntegration | null> | undefined;
  const loadGithub = () =>
    (githubPromise ??= getDecryptedIntegration(repo.userId, "github"));

  for (const commit of valid) {
    // A normal commit with no automation flags is expected behavior, not a
    // failure — log and move on.
    if (!commit.autoPR && !commit.taskCompleted) {
      await logWebhookEvent({
        repoId: repo.id,
        jiraKey: commit.jiraKey,
        commands: commit.commands,
        baseBranch: commit.baseBranch ?? null,
        pushBranch: commit.pushBranch,
        status: "skipped",
      });
      continue;
    }

    try {
      const jira = await loadJira();
      const cloudId = jira ? metadataString(jira.metadata, "cloudId") : null;
      if (!jira || !cloudId) {
        throw new Error(
          "Jira integration is not connected or has no site selected"
        );
      }
      const jiraCreds: JiraCreds = {
        accessToken: jira.accessToken,
        cloudId,
      };

      const task = await getTask(jiraCreds, commit.jiraKey);
      if (!task) {
        throw new Error(`Jira task ${commit.jiraKey} not found`);
      }

      let status: WebhookEventStatusValue;
      let prUrl: string | null = null;

      if (commit.autoPR) {
        const github = await loadGithub();
        if (!github) {
          throw new Error("GitHub integration is not connected");
        }
        const octokit = getGithubClient(github.accessToken);

        const existing = await checkPRExists(
          octokit,
          repo.owner,
          repo.name,
          commit.pushBranch
        );
        if (existing.exists) {
          status = "pr_exists";
          prUrl = existing.url ?? null;
        } else {
          const created = await createPR(octokit, {
            owner: repo.owner,
            repo: repo.name,
            title: `${commit.jiraKey} ${commit.commitDescription}`,
            head: commit.pushBranch,
            base: commit.baseBranch ?? repo.defaultBaseBranch ?? "main",
            body: `Auto Generated PR for Jira Task ${commit.jiraKey}`,
          });
          status = "pr_created";
          prUrl = created.url;
        }
      } else {
        status = "task_updated";
      }

      if (commit.taskCompleted) {
        // PR statuses take priority for the log entry, but the Jira update
        // still happens regardless of whether a PR action occurred.
        await updateTaskStatus(jiraCreds, commit.jiraKey, JIRA_DONE_TRANSITION_ID);
      }

      // Best-effort notifications: allSettled guarantees a Slack failure can't
      // suppress the Notion notification (or vice versa), and neither throws
      // into the loop below.
      const text = notificationText(commit, status, prUrl, `${repo.owner}/${repo.name}`);
      const results = await Promise.allSettled([
        notifySlack(repo.userId, text),
        notifyNotion(repo.userId, text),
      ]);
      const notificationError = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      )?.reason;

      await logWebhookEvent({
        repoId: repo.id,
        jiraKey: commit.jiraKey,
        commands: commit.commands,
        baseBranch: commit.baseBranch ?? null,
        pushBranch: commit.pushBranch,
        status,
        prUrl,
        errorMessage:
          notificationError instanceof Error
            ? `notification failed: ${notificationError.message}`
            : null,
      });
    } catch (error) {
      // One commit failing must never stop the rest of the push.
      await logWebhookEvent({
        repoId: repo.id,
        jiraKey: commit.jiraKey,
        commands: commit.commands,
        baseBranch: commit.baseBranch ?? null,
        pushBranch: commit.pushBranch,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: valid.length,
    invalid: invalid.length,
  });
}
