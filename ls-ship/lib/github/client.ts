import { Octokit } from "@octokit/rest";

// MVP note: this client authenticates with a single user-wide OAuth App token
// (`repo` scope covers every repo the user can access). Migrating to a GitHub
// App later would give per-repo scoped installation tokens instead — more
// secure at scale, since each connected repo would only grant access to itself.
export function getGithubClient(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}
