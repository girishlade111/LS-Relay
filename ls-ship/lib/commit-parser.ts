export const COMMIT_MESSAGE_REGEX = /^([A-Z]+-\d+)\s(.*?)(?:\s\[(.*)\])?$/;

export interface GitHubPushCommit {
  id: string;
  message: string;
}

export interface ParsedCommitData {
  jiraKey: string;
  commitDescription: string;
  commands: string[];
  baseBranch?: string;
  autoPR: boolean;
  taskCompleted: boolean;
  pushBranch: string;
}

export interface ParsedCommit extends ParsedCommitData {
  sha: string;
}

export interface InvalidCommit {
  sha: string;
  message: string;
  reason: string;
}

export interface ParseResult {
  valid: ParsedCommit[];
  invalid: InvalidCommit[];
}

export function parseSingleCommit(
  message: string,
  pushBranch: string
): ParsedCommitData {
  const match = COMMIT_MESSAGE_REGEX.exec(message);

  if (!match) {
    throw new Error(
      "Commit message format is incorrect. Missing task key or message."
    );
  }

  const jiraKey = match[1];
  const commitDescription = match[2];
  const flagString = match.length > 3 ? match[3] : undefined;

  const commands =
    flagString !== undefined
      ? flagString.split(",").map((flag) => flag.trim())
      : [];

  const autoPR = commands.includes("auto-pr");
  const taskCompleted = commands.includes("taskcompleted");

  const baseBranch = commands.find(
    (command) => command !== "auto-pr" && command !== "taskcompleted"
  );

  if (autoPR && !baseBranch) {
    throw new Error(
      "Commit message error: Please enter a base branch to create the PR in."
    );
  }

  return {
    jiraKey,
    commitDescription,
    commands,
    baseBranch,
    autoPR,
    taskCompleted,
    pushBranch,
  };
}

export function parsePushCommits(
  commits: GitHubPushCommit[],
  fullRef: string
): ParseResult {
  const REFS_HEADS_PREFIX = "refs/heads/";

  const pushBranch = fullRef.startsWith(REFS_HEADS_PREFIX)
    ? fullRef.slice(REFS_HEADS_PREFIX.length)
    : fullRef;

  const result: ParseResult = { valid: [], invalid: [] };

  for (const commit of commits) {
    try {
      const parsed = parseSingleCommit(commit.message, pushBranch);
      result.valid.push({ ...parsed, sha: commit.id });
    } catch (error) {
      result.invalid.push({
        sha: commit.id,
        message: commit.message,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
