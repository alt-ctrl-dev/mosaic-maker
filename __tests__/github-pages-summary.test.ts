import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("GitHub Pages Workflow Summary", () => {
	const workflowPath = join(__dirname, "../.github/workflows/pages.yml");
	let workflowContent: string;

	beforeAll(() => {
		workflowContent = existsSync(workflowPath)
			? readFileSync(workflowPath, "utf8")
			: "";
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
});
