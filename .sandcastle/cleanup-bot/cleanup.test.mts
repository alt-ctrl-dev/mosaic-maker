import { describe, it, expect } from "vitest";
import { extractIssueNumberFromBranch } from "./cleanup.mts";

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