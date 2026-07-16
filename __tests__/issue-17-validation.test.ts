import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("Issue #17 - Separate GitHub Pages deployment from pull request checks", () => {
  const prChecksWorkflowPath = join(
    __dirname,
    "../.github/workflows/pr-checks.yml"
  );
  const pagesWorkflowPath = join(__dirname, "../.github/workflows/pages.yml");
  let prChecksContent: string;
  let pagesContent: string;

  beforeAll(() => {
    prChecksContent = existsSync(prChecksWorkflowPath)
      ? readFileSync(prChecksWorkflowPath, "utf8")
      : "";
    pagesContent = existsSync(pagesWorkflowPath)
      ? readFileSync(pagesWorkflowPath, "utf8")
      : "";
  });

  it("should have separate workflow files", () => {
    expect(existsSync(prChecksWorkflowPath)).toBe(true);
    expect(existsSync(pagesWorkflowPath)).toBe(true);
  });

  it("pr-checks workflow should only trigger on pull requests", () => {
    expect(prChecksContent).toContain("pull_request:");
    expect(prChecksContent).not.toContain("push:");
  });

  it("pages workflow should only trigger on push to main", () => {
    expect(pagesContent).toContain("push:");
    expect(pagesContent).toContain("branches: [main]");
    expect(pagesContent).not.toContain("pull_request:");
  });

  it("pages workflow should not duplicate lint/format/test/typecheck jobs", () => {
    expect(pagesContent).not.toContain("lint:");
    expect(pagesContent).not.toContain("format:");
    expect(pagesContent).not.toContain("test:");
    expect(pagesContent).not.toContain("typecheck:");
    expect(pagesContent).toContain("build:");
  });

  it("workflows should have isolated permissions", () => {
    expect(prChecksContent).toContain("contents: read");
    expect(prChecksContent).not.toContain("pages: write");
    expect(prChecksContent).not.toContain("id-token: write");
    expect(pagesContent).toContain("contents: read");
    expect(pagesContent).toContain("pages: write");
    expect(pagesContent).toContain("id-token: write");
  });

  it("both workflows should support concurrency cancellation", () => {
    expect(prChecksContent).toContain("cancel-in-progress: true");
    expect(pagesContent).toContain("cancel-in-progress: true");
  });
});
