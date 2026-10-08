import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
	resolve(process.cwd(), "src/styles/workflow.css"),
	"utf8",
);

describe("workflow-step-button styling", () => {
	it("uses secondary background and color for resting state", () => {
		const rule = styles.match(/\.workflow-step-button\s*\{([^}]*)\}/);
		expect(rule).not.toBeNull();

		const ruleBody = rule?.[1] || "";
		expect(ruleBody).toContain("background-color: var(--secondary)");
		expect(ruleBody).toContain("color: var(--on-secondary)");
	});
});
