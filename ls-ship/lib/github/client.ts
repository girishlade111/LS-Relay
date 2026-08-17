import { Octokit } from "@octokit/rest";

/**
 * Returns a new Octokit instance authenticated with the given GitHub access token.
 * 
 * Note: This implementation uses a GitHub OAuth App which provides user-wide tokens.
 * For production at scale, consider migrating to a GitHub App which would give
 * per-repo scoped installation tokens instead of a single user-wide token, which is
 * more secure and follows the principle of least privilege.
 * 
 * @param accessToken - The GitHub OAuth access token
 * @returns An authenticated Octokit instance
 */
export function getGithubClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}
