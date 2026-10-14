import { beforeAll, describe, expect, it } from "vitest";
import { expectPinnedActionRefs, readWorkflow } from "./helpers/workflows";

describe("CodeQL Workflow", () => {
	let workflowContent: string;

	beforeAll(() => {
		workflowContent = readWorkflow(".github/workflows/codeql.yml");
	});

	it("keeps CodeQL analysis enabled", () => {
		expect(workflowContent).toContain('name: "CodeQL Advanced"');
		expect(workflowContent).toContain("github/codeql-action/analyze");
	});

	it("pins every action to a commit SHA with a version annotation", () => {
		expectPinnedActionRefs(workflowContent);
	});
});

describe("Container Agent Supply Chain", () => {
	let dockerfileContent: string;

	beforeAll(() => {
		dockerfileContent = readWorkflow(".sandcastle/Dockerfile");
	});

	it("pins the coding agent to an exact reviewed version", () => {
		expect(dockerfileContent).toContain("@mariozechner/pi-coding-agent@0.73.1");
		expect(dockerfileContent.split("\n")).not.toContain(
			"RUN pnpm install -g @mariozechner/pi-coding-agent",
		);
	});

	it("pins the package manager and base image to exact versions", () => {
		expect(dockerfileContent).toContain("pnpm@11.10.0");
		expect(dockerfileContent).toContain("node:24.18.1-bookworm");
	});
});

describe("Automated Update Proposals", () => {
	let dependabotContent: string;

	beforeAll(() => {
		dependabotContent = readWorkflow(".github/dependabot.yml");
	});

	it("keeps dependency and Action update proposals enabled", () => {
		expect(dependabotContent).toContain('package-ecosystem: "npm"');
		expect(dependabotContent).toContain('package-ecosystem: "github-actions"');
	});
});
