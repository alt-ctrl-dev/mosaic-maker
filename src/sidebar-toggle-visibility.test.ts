import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

const SIDEBAR_SELECTORS = [
	".workflow-sidebar-toggle",
	".workflow-sidebar-toggle-button",
	".workflow-sidebar-close",
	".workflow-sidebar-scrim",
] as const;

/**
 * Returns the body content between the outermost braces of the first
 * `@media (max-width: 900px)` block in the stylesheet.
 */
function mobileMediaBlock(css: string): string {
	const marker = "@media (max-width: 900px) {";
	const start = css.indexOf(marker);
	expect(start).toBeGreaterThanOrEqual(0);
	let depth = 0;
	let index = start + marker.length - 1;
	const open = index;
	for (; index < css.length; index += 1) {
		const char = css[index];
		if (char === "{") depth += 1;
		else if (char === "}") {
			depth -= 1;
			if (depth === 0) return css.slice(open + 1, index);
		}
	}
	throw new Error("Unterminated @media block");
}

/** Build a regex that matches a CSS rule for selectors joined with commas. */
function selectorRulePattern(selectors: readonly string[]): RegExp {
	const joined = selectors.map((s) => s.replace(/\./g, "\\.")).join(",\\s*");
	return new RegExp(`${joined}\\s*\\{[^}]*\\}`);
}

describe("sidebar toggle desktop visibility", () => {
	const desktopCss = styles.slice(
		0,
		styles.indexOf("@media (max-width: 900px)"),
	);

	it("hides toggle controls with display: none on desktop", () => {
		const prefixed = SIDEBAR_SELECTORS.map((s) => `.workflow-container ${s}`);
		const rule = desktopCss.match(selectorRulePattern(prefixed));
		expect(rule).not.toBeNull();
		expect(rule?.[0]).toContain("display: none");
	});

	it("does not use the opacity visually-hidden pattern on the checkbox", () => {
		expect(styles).not.toContain("clip-path: inset(50%)");
	});

	it("restores mobile controls with display: block at <= 900px", () => {
		const mobile = mobileMediaBlock(styles);
		// The .workflow-sidebar-toggle checkbox is a hidden <input>;
		// it does not get display: block on mobile.
		const mobileControls = SIDEBAR_SELECTORS.slice(1);
		for (const selector of mobileControls) {
			const rule = mobile.match(selectorRulePattern([selector]));
			expect(rule, `${selector} should have a mobile rule`).not.toBeNull();
			expect(rule?.[0]).toContain("display: block");
		}
	});
});
