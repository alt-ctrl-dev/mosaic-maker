import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { expectPinnedActionRefs, readWorkflow } from "./helpers/workflows";

describe("GitHub Pages Workflow", () => {
	const workflowPath = join(__dirname, "../.github/workflows/pages.yml");
	let workflowContent: string;

	beforeAll(() => {
		workflowContent = readWorkflow(".github/workflows/pages.yml");
	});

	it("has a pages workflow file", () => {
		expect(existsSync(workflowPath)).toBe(true);
	});

	it("writes the deployment link to the step summary", () => {
		expect(workflowContent).toContain("deploy:");
		expect(workflowContent).toContain("GITHUB_STEP_SUMMARY");
		expect(workflowContent).toContain("page_url");
		expect(workflowContent).toContain("Open Mosaic Maker");
	});

	it("does not use a redundant success() condition on the summary step", () => {
		expect(workflowContent).not.toContain(
			"Add deployment link to summary\n        if: success()",
		);
	});

	it("only triggers on push to main", () => {
		expect(workflowContent).toContain("push:");
		expect(workflowContent).not.toContain("pull_request");
	});

	it("keeps the build job read-only", () => {
		const beforeJobs = workflowContent.split("jobs:")[0];
		expect(beforeJobs).toContain("contents: read");
		expect(beforeJobs).not.toContain("pages: write");
		expect(beforeJobs).not.toContain("id-token: write");
	});

	it("grants publishing permissions only to the deploy job", () => {
		const deployJob = workflowContent.slice(
			workflowContent.indexOf("  deploy:"),
		);
		expect(deployJob).toContain("pages: write");
		expect(deployJob).toContain("id-token: write");
	});

	it("pins every action to a commit SHA with a version annotation", () => {
		expectPinnedActionRefs(workflowContent);
	});
});
