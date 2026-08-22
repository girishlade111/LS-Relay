import type { Octokit } from "@octokit/rest";

export interface PRExistsResult {
  exists: boolean;
  url?: string;
  number?: number;
}

export async function checkPRExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  headBranch: string
): Promise<PRExistsResult> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${headBranch}`,
    state: "open",
  });

  const existing = data[0];
  if (!existing) {
    return { exists: false };
  }

  return { exists: true, url: existing.html_url, number: existing.number };
}

export interface CreatePRParams {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body: string;
}

export interface PRResult {
  url: string;
  number: number;
}

export async function createPR(
  octokit: Octokit,
  { owner, repo, title, head, base, body }: CreatePRParams
): Promise<PRResult> {
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body,
  });

  return { url: data.html_url, number: data.number };
}
