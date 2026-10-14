import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { expectPinnedActionRefs, readWorkflow } from "./helpers/workflows";

describe("Pull Request Checks Workflow", () => {
	const workflowPath = join(__dirname, "../.github/workflows/pr-checks.yml");
	let workflowContent: string;

	beforeAll(() => {
		workflowContent = readWorkflow(".github/workflows/pr-checks.yml");
	});

	it("has a separate PR checks workflow file", () => {
		expect(existsSync(workflowPath)).toBe(true);
	});

	it("triggers on the expected pull request events", () => {
		expect(workflowContent).toContain("pull_request:");
		expect(workflowContent).toContain(
			"types: [opened, synchronize, reopened, ready_for_review]",
		);
	});

	it("runs checks only for non-draft pull requests", () => {
		const draftGuards =
			workflowContent.match(
				/if: github\.event\.pull_request\.draft == false/g,
			) ?? [];
		expect(draftGuards).toHaveLength(5);
	});

	it("defines all required check jobs", () => {
		for (const job of ["lint:", "format:", "test:", "typecheck:", "build:"]) {
			expect(workflowContent).toContain(job);
		}
	});

	it("runs every check regardless of documentation changes", () => {
		expect(workflowContent).not.toContain("docs_only");
		expect(workflowContent).not.toContain("paths-filter");
		expect(workflowContent).not.toContain("added|modified");
		expect(workflowContent).not.toContain("needs:");
	});

	it("installs with a frozen lockfile before every check", () => {
		const installs =
			workflowContent.match(/pnpm install --frozen-lockfile/g) ?? [];
		expect(installs).toHaveLength(5);
	});

	it("keeps build and install jobs read-only", () => {
		expect(workflowContent).toContain("permissions:");
		expect(workflowContent).toContain("contents: read");
		expect(workflowContent).not.toContain("contents: write");
		expect(workflowContent).not.toContain("id-token");
	});

	it("never exposes repository secrets to fork PR validation", () => {
		expect(workflowContent).not.toContain("secrets.");
	});

	it("pins every action to a commit SHA with a version annotation", () => {
		expectPinnedActionRefs(workflowContent);
	});

	it("cancels superseded runs", () => {
		expect(workflowContent).toContain("cancel-in-progress: true");
	});
});
