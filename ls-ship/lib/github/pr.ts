import { Octokit } from "@octokit/rest";

/**
 * Checks if a pull request already exists for the given head branch.
 * 
 * @param octokit - The authenticated Octokit instance
 * @param owner - The repository owner (org or user)
 * @param repo - The repository name
 * @param headBranch - The head branch name to check
 * @returns Object with `exists` boolean, and optionally `url` and `number` if a PR exists
 */
export async function checkPRExists(
  octokit: Octokit,
  owner: string,
  repo: string,
  headBranch: string
): Promise<{ exists: boolean; url?: string; number?: number }> {
  const response = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${headBranch}`,
    state: "open",
  });

  const pr = response.data[0];

  if (pr) {
    return {
      exists: true,
      url: pr.html_url,
      number: pr.number,
    };
  }

  return { exists: false };
}

/**
 * Creates a new pull request.
 * 
 * @param octokit - The authenticated Octokit instance
 * @param params - PR creation parameters
 * @returns Object with `url` and `number` of the created PR
 */
export async function createPR(
  octokit: Octokit,
  params: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body: string;
  }
): Promise<{ url: string; number: number }> {
  const { owner, repo, title, head, base, body } = params;

  const response = await octokit.pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body,
  });

  return {
    url: response.data.html_url,
    number: response.data.number,
  };
}
