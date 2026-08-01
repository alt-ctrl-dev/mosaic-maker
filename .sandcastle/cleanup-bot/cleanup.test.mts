import { describe, it, expect } from "vitest";
import { extractIssueNumberFromBranch, parseWorktreePorcelain } from "./cleanup.mts";

describe("extractIssueNumberFromBranch", () => {
  it("returns the issue number for a valid sandcastle branch", () => {
    expect(extractIssueNumberFromBranch("sandcastle/issue-54")).toBe(54);
  });

  it("returns the issue number for a multi-digit issue", () => {
    expect(extractIssueNumberFromBranch("sandcastle/issue-1234")).toBe(1234);
  });

  it("returns null for a branch without a slash", () => {
    expect(extractIssueNumberFromBranch("main")).toBeNull();
  });

  it("returns null for a non-sandcastle branch with slash", () => {
    expect(extractIssueNumberFromBranch("feature/task-creation")).toBeNull();
  });

  it("returns null for a sandcastle branch without issue-number suffix", () => {
    expect(extractIssueNumberFromBranch("sandcastle/other")).toBeNull();
  });

  it("returns null for an issue branch missing the leading sandcastle/", () => {
    expect(extractIssueNumberFromBranch("issue-42")).toBeNull();
  });

  it("returns null for a branch that only partially matches", () => {
    expect(extractIssueNumberFromBranch("sandcastle/issue-42-extra")).toBeNull();
  });
});

describe("parseWorktreePorcelain", () => {
  it("parses the main worktree and an issue worktree with short branch names", () => {
    const output = [
      "worktree /repo",
      "HEAD abc123",
      "branch refs/heads/main",
      "",
      "worktree /repo/.sandcastle/worktrees/sandcastle-issue-54",
      "HEAD def456",
      "branch refs/heads/sandcastle/issue-54",
      "",
    ].join("\n");

    expect(parseWorktreePorcelain(output)).toEqual([
      { path: "/repo", branch: "main" },
      {
        path: "/repo/.sandcastle/worktrees/sandcastle-issue-54",
        branch: "sandcastle/issue-54",
      },
    ]);
  });

  it("reports a null branch for a detached worktree", () => {
    const output = ["worktree /repo/detached", "HEAD abc123", "detached", ""].join("\n");

    expect(parseWorktreePorcelain(output)).toEqual([{ path: "/repo/detached", branch: null }]);
  });

  it("returns an empty list for empty output", () => {
    expect(parseWorktreePorcelain("")).toEqual([]);
  });
});
