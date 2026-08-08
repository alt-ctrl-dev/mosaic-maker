import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("Status Panel Styling", () => {
	it("should not reference nonexistent pico-contrast-color variable", () => {
		// This should fail initially - we're testing for the bug
		expect(styles).not.toContain("var(--pico-contrast-color)");
	});

	it("should use Pico's article element for status panels instead of custom boxes", () => {
		// Check that we're not manually styling these panels with background and color
		const panelSelectors = [
			".processing-indicator",
			".generation-info",
			".generation-progress",
			".error-message",
			".warning-message",
		];

		panelSelectors.forEach((selector) => {
			const escapedSelector = selector.replace(/\./g, "\\.");
			const rulePattern = new RegExp(
				`${escapedSelector}\\s*\\{([^}]*)\\}`,
				"s",
			);
			const match = styles.match(rulePattern);

			if (match) {
				const ruleBody = match[1];
				// Should not manually set background or color - should use Pico article instead
				expect(ruleBody).not.toContain(
					"background-color: var(--pico-contrast-background)",
				);
				expect(ruleBody).not.toContain("color: var(--pico-contrast-color)");
			}
		});
	});
});
