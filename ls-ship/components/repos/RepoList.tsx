"use client";

import { useState, type FormEvent } from "react";
import type { RepoListItem } from "@/lib/db/queries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Row } from "@/components/ui/Row";
import { Toggle } from "@/components/ui/Toggle";

// createdAt arrives as ISO string from JSON responses but as Date from the
// server render — accept both and normalize at format time.
type RepoItem = Omit<RepoListItem, "createdAt"> & { createdAt: string | Date };

interface SetupInfo {
  repo: RepoItem;
  webhookUrl: string;
  webhookSecret: string;
}

interface GithubRepoOption {
  owner: string;
  name: string;
  defaultBranch: string;
  isPrivate: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" onClick={copy} className="shrink-0">
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function RepoList({
  initialRepos,
  githubConnected,
}: {
  initialRepos: RepoListItem[];
  githubConnected: boolean;
}) {
  const [repos, setRepos] = useState<RepoItem[]>(initialRepos);
  const [mode, setMode] = useState<"picker" | "manual">(
    githubConnected ? "picker" : "manual"
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupInfo | null>(null);

  const [ghLoading, setGhLoading] = useState(false);
  const [ghLoaded, setGhLoaded] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghRepos, setGhRepos] = useState<GithubRepoOption[]>([]);

  async function connectRepo(payload: {
    owner: string;
    name: string;
    defaultBaseBranch?: string;
  }): Promise<boolean> {
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setFormError(body.error ?? "Failed to add repo");
        return false;
      }
      setRepos((prev) => [body.repo as RepoItem, ...prev]);
      setSetup(body as SetupInfo);
      return true;
    } catch {
      setFormError("Network error — please try again");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const baseBranchRaw = String(data.get("defaultBaseBranch") ?? "").trim();

    const ok = await connectRepo({
      owner: String(data.get("owner") ?? "").trim(),
      name: String(data.get("name") ?? "").trim(),
      ...(baseBranchRaw ? { defaultBaseBranch: baseBranchRaw } : {}),
    });
    if (ok) {
      form.reset();
    }
  }

  async function loadGithubRepos() {
    if (ghLoading) {
      return;
    }
    setGhLoading(true);
    setGhError(null);
    try {
      const response = await fetch("/api/integrations/github/repos");
      const body = await response.json();
      if (!response.ok) {
        setGhError(body.error ?? "Failed to load repositories");
        return;
      }
      const connected = new Set(repos.map((repo) => `${repo.owner}/${repo.name}`));
      setGhRepos(
        (body.repos as GithubRepoOption[]).filter(
          (repo) => !connected.has(`${repo.owner}/${repo.name}`)
        )
      );
      setGhLoaded(true);
    } catch {
      setGhError("Network error — please try again");
    } finally {
      setGhLoading(false);
    }
  }

  async function handlePick(repo: GithubRepoOption) {
    const ok = await connectRepo({
      owner: repo.owner,
      name: repo.name,
      defaultBaseBranch: repo.defaultBranch,
    });
    if (ok) {
      setGhRepos((prev) =>
        prev.filter((r) => !(r.owner === repo.owner && r.name === repo.name))
      );
    }
  }

  async function handleToggle(repoId: string, active: boolean) {
    setActionError(null);
    setRepos((prev) =>
      prev.map((repo) => (repo.id === repoId ? { ...repo, active } : repo))
    );
    const response = await fetch("/api/repos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId, active }),
    });
    if (!response.ok) {
      setActionError("Could not update the repo — please retry");
      setRepos((prev) =>
        prev.map((repo) => (repo.id === repoId ? { ...repo, active: !active } : repo))
      );
    }
  }

  async function handleDelete(repo: RepoItem) {
    if (
      !window.confirm(
        `Delete ${repo.owner}/${repo.name}? Its webhook will stop working.`
      )
    ) {
      return;
    }

    setActionError(null);
    const snapshot = repos;
    setRepos((prev) => prev.filter((r) => r.id !== repo.id));
    const response = await fetch("/api/repos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId: repo.id }),
    });
    if (!response.ok) {
      setRepos(snapshot);
      setActionError("Could not delete the repo — please retry");
    }
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium">Add a repo</h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={mode === "picker" ? "accent" : "default"}
              onClick={() => githubConnected && setMode("picker")}
              disabled={!githubConnected}
              className="px-2.5 py-1"
            >
              From GitHub
            </Button>
            <Button
              type="button"
              variant={mode === "manual" ? "accent" : "default"}
              onClick={() => setMode("manual")}
              className="px-2.5 py-1"
            >
              Manually
            </Button>
          </div>
        </div>

        {!githubConnected ? (
          <p className="mt-2 text-sm text-text-muted">
            Connect GitHub on the Integrations page to pick repos from your
            account instead of typing them.
          </p>
        ) : null}

        {mode === "picker" && githubConnected ? (
          <div className="mt-3">
            {!ghLoaded ? (
              <Button onClick={loadGithubRepos} variant="accent" disabled={ghLoading}>
                {ghLoading ? "Loading…" : "Load my GitHub repositories"}
              </Button>
            ) : ghRepos.length === 0 ? (
              <p className="text-sm text-text-muted">
                Nothing new found — all your reachable repos are already
                connected.{" "}
                <button
                  type="button"
                  onClick={() => setGhLoaded(false)}
                  className="text-accent hover:underline"
                >
                  Reload
                </button>{" "}
                or switch to Manually.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-card border border-border">
                {ghRepos.map((repo, index) => (
                  <div
                    key={`${repo.owner}/${repo.name}`}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      index === ghRepos.length - 1 ? "" : "border-b border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        {repo.owner}/{repo.name}
                        {repo.isPrivate ? (
                          <span className="ml-2 text-xs text-text-muted">
                            private
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-text-muted">
                        default branch: {repo.defaultBranch}
                      </p>
                    </div>
                    <Button
                      onClick={() => handlePick(repo)}
                      disabled={submitting}
                      className="shrink-0"
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {ghError ? (
              <div className="mt-3">
                <Badge variant="danger">{ghError}</Badge>
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "manual" || !githubConnected ? (
          <form
            onSubmit={handleAdd}
            className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 text-sm text-text-muted">
              Owner
              <Input
                name="owner"
                placeholder="e.g. vercel"
                required
                className="mt-1"
              />
            </label>
            <label className="flex-1 text-sm text-text-muted">
              Repository
              <Input
                name="name"
                placeholder="e.g. next.js"
                required
                className="mt-1"
              />
            </label>
            <label className="flex-1 text-sm text-text-muted">
              Default base branch (optional)
              <Input name="defaultBaseBranch" placeholder="main" className="mt-1" />
            </label>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Adding…" : "Add Repo"}
            </Button>
          </form>
        ) : null}

        {formError ? (
          <div className="mt-3">
            <Badge variant="danger">{formError}</Badge>
          </div>
        ) : null}
      </Card>

      {actionError ? (
        <div className="mt-4">
          <Badge variant="danger">{actionError}</Badge>
        </div>
      ) : null}

      <Card className="mt-4">
        {repos.length === 0 ? (
          <Row
            title="No repos connected yet"
            description={
              githubConnected
                ? "Load your GitHub repositories above and connect one in a single click."
                : "Add your first repository above to start receiving push events."
            }
            last
          />
        ) : (
          repos.map((repo, index) => (
            <Row
              key={repo.id}
              title={`${repo.owner}/${repo.name}`}
              description={`${
                repo.defaultBaseBranch ? `base ${repo.defaultBaseBranch}` : "repository default branch"
              } · added ${dateFormatter.format(new Date(repo.createdAt))}`}
              action={
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={repo.active}
                    onChange={(active) => handleToggle(repo.id, active)}
                  />
                  <Button variant="danger" onClick={() => handleDelete(repo)}>
                    Delete
                  </Button>
                </div>
              }
              last={index === repos.length - 1}
            />
          ))
        )}
      </Card>

      {/* One-time setup card. The plaintext secret only exists in this state —
          once dismissed or on navigation it can never be retrieved again. */}
      {setup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-h1">Add the webhook on GitHub</h2>
              <Badge variant="danger">Secret shown once</Badge>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <p className="text-sm text-text-muted">Payload URL</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-control border border-border bg-panel-2 px-3 py-1.5 font-mono text-xs">
                    {setup.webhookUrl}
                  </code>
                  <CopyButton value={setup.webhookUrl} />
                </div>
              </div>
              <div>
                <p className="text-sm text-text-muted">Secret</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-control border border-border bg-panel-2 px-3 py-1.5 font-mono text-xs">
                    {setup.webhookSecret}
                  </code>
                  <CopyButton value={setup.webhookSecret} />
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  This secret will never be shown again after you leave this
                  page — copy it somewhere safe now.
                </p>
              </div>
            </div>

            <ol className="mt-5 list-decimal space-y-1 pl-5 text-sm text-text-muted">
              <li>Go to the GitHub repo&apos;s Settings → Webhooks → Add webhook.</li>
              <li>Paste the URL above as Payload URL.</li>
              <li>Set Content type to application/json.</li>
              <li>Paste the secret above as Secret.</li>
              <li>Select &quot;Just the push event&quot;.</li>
              <li>Save.</li>
            </ol>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSetup(null)}>Done</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
