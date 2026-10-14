import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

const PROJECT_ROOT = join(__dirname, "..", "..");

const PINNED_ACTION_REF = /^[^@\s]+@[0-9a-f]{40}\s+#\s+v\d+(\.\d+)*$/;

/** Reads a workflow or container file from the repository root, or returns an empty string when missing. */
export function readWorkflow(relativePath: string): string {
	const absolutePath = join(PROJECT_ROOT, relativePath);
	return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
}

/** Asserts every `uses:` reference is pinned to a commit SHA with a readable version annotation. */
export function expectPinnedActionRefs(content: string): void {
	const refs = content
		.split("\n")
		.map((line) => line.trim().replace(/^- /, ""))
		.filter((line) => line.startsWith("uses:"))
		.map((line) => line.slice("uses:".length).trim());

	expect(refs.length).toBeGreaterThan(0);
	for (const ref of refs) {
		expect(ref).toMatch(PINNED_ACTION_REF);
	}
}
