import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

/**
 * Returns the body of the first `@media (max-width: 900px)` block found in the
 * stylesheet, matching braces so nested rule blocks are captured intact.
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

describe("sidebar toggle desktop visibility", () => {
	it("hides toggle controls with display: none on desktop", () => {
		const desktopCss = styles.slice(
			0,
			styles.indexOf("@media (max-width: 900px)"),
		);
		const rule = desktopCss.match(
			/\.workflow-sidebar-toggle,\s*\.workflow-sidebar-toggle-button,\s*\.workflow-sidebar-close,\s*\.workflow-sidebar-scrim\s*\{[^}]*\}/,
		);
		expect(rule).not.toBeNull();
		expect(rule?.[0]).toContain("display: none");
	});

	it("does not use the opacity visually-hidden pattern on the checkbox", () => {
		expect(styles).not.toContain("clip-path: inset(50%)");
	});

	it("restores mobile controls with display: block at <= 900px", () => {
		const mobile = mobileMediaBlock(styles);
		for (const selector of [
			".workflow-sidebar-toggle-button",
			".workflow-sidebar-close",
			".workflow-sidebar-scrim",
		]) {
			const rule = mobile.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`));
			expect(rule, `${selector} should have a mobile rule`).not.toBeNull();
			expect(rule?.[0]).toContain("display: block");
		}
	});
});
