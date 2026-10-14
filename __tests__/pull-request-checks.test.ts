import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("Pull Request Checks Workflow", () => {
	const workflowPath = join(__dirname, "../.github/workflows/pr-checks.yml");
	const pagesWorkflowPath = join(__dirname, "../.github/workflows/pages.yml");
	let workflowContent: string;
	let pagesWorkflowContent: string;

	beforeAll(() => {
		workflowContent = existsSync(workflowPath)
			? readFileSync(workflowPath, "utf8")
			: "";
		pagesWorkflowContent = existsSync(pagesWorkflowPath)
			? readFileSync(pagesWorkflowPath, "utf8")
			: "";
	});

	it("should have a separate PR checks workflow file", () => {
		expect(existsSync(workflowPath)).toBe(true);
	});

	it("should have correct triggers for pull requests", () => {
		expect(workflowContent).toContain("pull_request:");
		expect(workflowContent).toContain(
			"types: [opened, synchronize, reopened, ready_for_review]",
		);
	});

	it("should run checks for all non-draft pull requests", () => {
		expect(workflowContent).not.toContain(
			"github.event.pull_request.draft == false",
		);
		// Checks should run for all non-draft PRs, not filtered by documentation changes
	});

	it("should cancel in-progress runs", () => {
		expect(workflowContent).toContain("cancel-in-progress: true");
	});

	it("should have jobs for all required checks", () => {
		expect(workflowContent).toContain("lint:");
		expect(workflowContent).toContain("format:");
		expect(workflowContent).toContain("test:");
		expect(workflowContent).toContain("typecheck:");
		expect(workflowContent).toContain("build:");
	});

	it("should have read-only permissions", () => {
		expect(workflowContent).toContain("contents: read");
	});

	it("pages workflow should only trigger on push", () => {
		expect(pagesWorkflowContent).not.toContain("pull_request");
		expect(pagesWorkflowContent).toContain("push:");
	});

	it("should not use documentation-based filtering", () => {
		expect(workflowContent).not.toContain("added|modified: '*.md'");
		expect(workflowContent).not.toContain("docs_only");
		// Documentation-based filtering has been removed
	});
});
