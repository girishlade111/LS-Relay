import "server-only";
import type { Octokit } from "@octokit/rest";

export type WebhookRegistration =
  | { status: "created" | "updated"; hookId: number }
  | { status: "failed"; reason: string };

// Creates or updates the push webhook on a GitHub repo so the user never has
// to configure anything manually. Requires admin:write on the repo — org
// repos where the member lacks admin will land in the failed branch and the
// UI falls back to manual setup instructions.
export async function upsertRepoWebhook(
  octokit: Octokit,
  params: { owner: string; repo: string; url: string; secret: string }
): Promise<WebhookRegistration> {
  const config = {
    url: params.url,
    content_type: "json",
    secret: params.secret,
    insecure_ssl: "0",
  };

  try {
    const { data: hooks } = await octokit.repos.listWebhooks({
      owner: params.owner,
      repo: params.repo,
      per_page: 100,
    });

    const existing = hooks.find((hook) => hook.config?.url === params.url);
    if (existing) {
      await octokit.repos.updateWebhook({
        owner: params.owner,
        repo: params.repo,
        hook_id: existing.id,
        config,
        events: ["push"],
        active: true,
      });
      return { status: "updated", hookId: existing.id };
    }

    const { data: created } = await octokit.repos.createWebhook({
      owner: params.owner,
      repo: params.repo,
      name: "web",
      active: true,
      events: ["push"],
      config,
    });

    return { status: "created", hookId: created.id };
  } catch (error) {
    let reason = error instanceof Error ? error.message : String(error);
    if (/404|not found/i.test(reason)) {
      reason =
        "your GitHub authorization predates the webhook permission — click Reconnect on the Integrations page, then retry";
    } else if (/403|forbidden/i.test(reason)) {
      reason =
        "your GitHub account lacks admin rights on this repo (org repos often restrict webhooks)";
    }
    return { status: "failed", reason };
  }
}
