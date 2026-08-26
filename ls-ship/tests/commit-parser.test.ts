import { describe, expect, it } from "vitest";
import {
  parsePushCommits,
  parseSingleCommit,
  type GitHubPushCommit,
} from "@/lib/commit-parser";

function commit(message: string, id = "abc123"): GitHubPushCommit {
  return { id, message };
}

describe("parseSingleCommit", () => {
  it("parses a plain tracked commit", () => {
    const parsed = parseSingleCommit("PROJ-101 Fix mobile nav", "feature/x");
    expect(parsed.jiraKey).toBe("PROJ-101");
    expect(parsed.commitDescription).toBe("Fix mobile nav");
    expect(parsed.commands).toEqual([]);
    expect(parsed.autoPR).toBe(false);
    expect(parsed.taskCompleted).toBe(false);
    expect(parsed.pushBranch).toBe("feature/x");
  });

  it("parses auto-pr with an explicit base branch", () => {
    const parsed = parseSingleCommit(
      "PROJ-102 Add dark mode [auto-pr,main]",
      "feature/dark"
    );
    expect(parsed.autoPR).toBe(true);
    expect(parsed.baseBranch).toBe("main");
  });

  it("parses taskcompleted without a PR request", () => {
    const parsed = parseSingleCommit(
      "PROJ-104 Fix overflow [taskcompleted]",
      "hotfix"
    );
    expect(parsed.taskCompleted).toBe(true);
    expect(parsed.autoPR).toBe(false);
  });

  it("supports flags in any order and trims whitespace", () => {
    const parsed = parseSingleCommit(
      "PROJ-106 Ship it [ taskcompleted , auto-pr , develop ]",
      "dev"
    );
    expect(parsed.taskCompleted).toBe(true);
    expect(parsed.autoPR).toBe(true);
    expect(parsed.baseBranch).toBe("develop");
  });

  it("treats any unknown flag as the base branch", () => {
    const parsed = parseSingleCommit(
      "CORE-9 Release prep [release/v1.0]",
      "main"
    );
    expect(parsed.baseBranch).toBe("release/v1.0");
  });

  it("rejects auto-pr without a base branch", () => {
    expect(() => parseSingleCommit("PROJ-103 Fix bug [auto-pr]", "main")).toThrow(
      /base branch/i
    );
  });

  it("rejects messages missing the Jira key", () => {
    expect(() => parseSingleCommit("Fix login validation", "main")).toThrow();
  });

  it("rejects lowercase task keys", () => {
    expect(() =>
      parseSingleCommit("proj-101 lowercase key [auto-pr,main]", "main")
    ).toThrow();
  });

  it("rejects key-only messages without a description", () => {
    expect(() => parseSingleCommit("PROJ-102 [auto-pr,main]", "main")).toThrow();
  });

  it("parses only the subject line of multi-line commit messages", () => {
    // Git messages typically carry bodies and trailing newlines; before the
    // subject normalization every such commit was rejected as invalid.
    const parsed = parseSingleCommit(
      "PROJ-201 Add OAuth redirect\n\nLonger body text\nCo-authored-by: x",
      "feature/oauth"
    );
    expect(parsed.jiraKey).toBe("PROJ-201");
    expect(parsed.commitDescription).toBe("Add OAuth redirect");
    expect(parsed.commands).toEqual([]);
  });

  it("parses flags from the subject line even when a body follows", () => {
    const parsed = parseSingleCommit(
      "PROJ-202 Polish dashboard [auto-pr,staging]\nbody",
      "polish"
    );
    expect(parsed.baseBranch).toBe("staging");
  });

  it("tolerates trailing whitespace around the message", () => {
    const parsed = parseSingleCommit("  PROJ-300 Trim me  \n", "trim");
    expect(parsed.jiraKey).toBe("PROJ-300");
    expect(parsed.commitDescription).toBe("Trim me");
  });
});

describe("parsePushCommits", () => {
  it("strips the refs/heads prefix for pushBranch", () => {
    const result = parsePushCommits([commit("PROJ-1 A")], "refs/heads/main");
    expect(result.valid[0]?.pushBranch).toBe("main");
  });

  it("passes through refs without the prefix", () => {
    const result = parsePushCommits([commit("PROJ-1 A")], "main");
    expect(result.valid[0]?.pushBranch).toBe("main");
  });

  it("splits valid and invalid commits and keeps processing after failures", () => {
    const result = parsePushCommits(
      [
        commit("not valid at all", "sha-invalid"),
        commit("PROJ-5 Valid one [taskcompleted]", "sha-valid"),
        commit("PROJ-6 Missing base [auto-pr]", "sha-nobase"),
      ],
      "refs/heads/dev"
    );

    expect(result.valid.map((c) => c.sha)).toEqual(["sha-valid"]);
    expect(result.invalid.map((c) => c.sha)).toEqual([
      "sha-invalid",
      "sha-nobase",
    ]);
    expect(result.invalid[0]?.reason).toMatch(/format is incorrect/i);
    expect(result.invalid[1]?.reason).toMatch(/base branch/i);
  });

  it("returns empty buckets for empty pushes", () => {
    expect(parsePushCommits([], "refs/heads/main")).toEqual({
      valid: [],
      invalid: [],
    });
  });
});
