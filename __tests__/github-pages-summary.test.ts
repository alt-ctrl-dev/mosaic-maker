import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("GitHub Pages Workflow Summary", () => {
	it("should have deploy job that writes to GITHUB_STEP_SUMMARY", () => {
		const workflowPath = join(__dirname, "../.github/workflows/pages.yml");
		const workflowContent = readFileSync(workflowPath, "utf-8");

		// Check that the workflow has a deploy job
		expect(workflowContent).toContain("deploy:");

		// Check that the deploy job writes to GITHUB_STEP_SUMMARY after successful deployment
		expect(workflowContent).toContain("GITHUB_STEP_SUMMARY");
		expect(workflowContent).toContain("page_url");
		expect(workflowContent).toContain("Open Mosaic Maker");
	});
});
