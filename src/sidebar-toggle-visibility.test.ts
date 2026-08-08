import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

type Specificity = [number, number, number];

/** Metadata for a CSS declaration that matched an element, including cascade priority fields. */
interface MatchedDeclaration {
	specificity: Specificity;
	order: number;
	value: string;
}

/** Compare two specificity tuples, returning `a[i] - b[i]` at the first differing component. */
function compareSpecificity(a: Specificity, b: Specificity): number {
	for (let i = 0; i < 3; i += 1) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

/**
 * Compute the specificity of a single (non-grouped) selector as an
 * [ids, classes, types] tuple. Handles the class, attribute, pseudo-class,
 * id and type/pseudo-element selectors used in this stylesheet.
 */
function selectorSpecificity(selector: string): Specificity {
	const ids = (selector.match(/#[\w-]+/g) ?? []).length;
	const classes =
		(selector.match(/\.[\w-]+/g) ?? []).length +
		(selector.match(/\[[^\]]*\]/g) ?? []).length +
		(selector.match(/:(?!:)[\w-]+/g) ?? []).length;
	const types =
		(selector.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length +
		(selector.match(/::[\w-]+/g) ?? []).length;
	return [ids, classes, types];
}

/**
 * Evaluate a `(max-width: …)` / `(min-width: …)` media query text against a
 * viewport width in pixels. Supports the `px` and `rem` units used here.
 */
function mediaMatches(mediaText: string, viewportWidthPx: number): boolean {
	const toPx = (raw: string): number => {
		const value = Number.parseFloat(raw);
		return raw.trim().endsWith("rem") ? value * 16 : value;
	};
	let matches = true;
	const maxWidth = mediaText.match(/max-width:\s*([\d.]+(?:px|rem))/);
	if (maxWidth) matches &&= viewportWidthPx <= toPx(maxWidth[1]);
	const minWidth = mediaText.match(/min-width:\s*([\d.]+(?:px|rem))/);
	if (minWidth) matches &&= viewportWidthPx >= toPx(minWidth[1]);
	return matches;
}

/**
 * Resolve the effective value of a CSS property for an element at a given
 * viewport width by walking the CSSOM and applying the cascade (specificity
 * then document order), honouring `@media` width queries. JSDOM's
 * `getComputedStyle` ignores media queries, so we resolve them ourselves.
 */
function resolveProperty(
	element: Element,
	property: string,
	viewportWidthPx: number,
): string | undefined {
	const matched: MatchedDeclaration[] = [];
	let order = 0;

	const visitStyleRule = (rule: CSSStyleRule) => {
		const value = rule.style.getPropertyValue(property);
		if (value) {
			for (const selector of rule.selectorText.split(",")) {
				const trimmed = selector.trim();
				if (element.matches(trimmed)) {
					matched.push({
						specificity: selectorSpecificity(trimmed),
						order,
						value: value.trim(),
					});
				}
			}
		}
		order += 1;
	};

	for (const sheet of Array.from(document.styleSheets)) {
		for (const rule of Array.from(sheet.cssRules)) {
			if (rule instanceof CSSMediaRule) {
				if (!mediaMatches(rule.media.mediaText, viewportWidthPx)) {
					order += rule.cssRules.length;
					continue;
				}
				for (const inner of Array.from(rule.cssRules)) {
					if (inner instanceof CSSStyleRule) visitStyleRule(inner);
					else order += 1;
				}
			} else if (rule instanceof CSSStyleRule) {
				visitStyleRule(rule);
			}
		}
	}

	if (matched.length === 0) return undefined;
	matched.sort((a, b) => {
		const bySpecificity = compareSpecificity(a.specificity, b.specificity);
		return bySpecificity !== 0 ? bySpecificity : a.order - b.order;
	});
	return matched[matched.length - 1]?.value;
}

const DESKTOP_WIDTH = 1024;
const MOBILE_WIDTH = 900;

describe("sidebar toggle visibility", () => {
	let styleElement: HTMLStyleElement;
	let toggleButton: HTMLLabelElement;
	let closeButton: HTMLLabelElement;
	let toggleInput: HTMLInputElement;

	beforeEach(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = styles;
		document.head.appendChild(styleElement);

		document.body.innerHTML = `
			<main class="workflow-container">
				<input type="checkbox" class="workflow-sidebar-toggle" id="sidebar-toggle" />
				<label for="sidebar-toggle" class="workflow-sidebar-toggle-button">☰</label>
				<aside class="workflow-sidebar">
					<label for="sidebar-toggle" class="workflow-sidebar-close">✕</label>
				</aside>
			</main>
		`;

		toggleButton = document.querySelector(
			"label.workflow-sidebar-toggle-button",
		) as HTMLLabelElement;
		closeButton = document.querySelector(
			"label.workflow-sidebar-close",
		) as HTMLLabelElement;
		toggleInput = document.querySelector(
			"input.workflow-sidebar-toggle",
		) as HTMLInputElement;
	});

	afterEach(() => {
		styleElement.remove();
		document.body.innerHTML = "";
	});

	it("renders the toggle controls as label elements bound to the checkbox", () => {
		expect(toggleButton.tagName).toBe("LABEL");
		expect(closeButton.tagName).toBe("LABEL");
		expect(toggleButton.htmlFor).toBe(toggleInput.id);
		expect(closeButton.htmlFor).toBe(toggleInput.id);
	});

	describe("on desktop (> 900px)", () => {
		it("hides the toggle button", () => {
			expect(resolveProperty(toggleButton, "display", DESKTOP_WIDTH)).toBe(
				"none",
			);
		});

		it("hides the close button", () => {
			expect(resolveProperty(closeButton, "display", DESKTOP_WIDTH)).toBe(
				"none",
			);
		});

		it("keeps the toggle checkbox itself hidden", () => {
			expect(resolveProperty(toggleInput, "display", DESKTOP_WIDTH)).toBe(
				"none",
			);
		});
	});

	describe("on mobile (<= 900px)", () => {
		it("shows the toggle button", () => {
			expect(resolveProperty(toggleButton, "display", MOBILE_WIDTH)).toBe(
				"block",
			);
		});

		it("shows the close button", () => {
			expect(resolveProperty(closeButton, "display", MOBILE_WIDTH)).toBe(
				"block",
			);
		});

		it("keeps the toggle checkbox itself hidden", () => {
			expect(resolveProperty(toggleInput, "display", MOBILE_WIDTH)).toBe(
				"none",
			);
		});
	});

	it("gives the desktop hide rule label-level specificity so it overrides Pico's [type=checkbox] ~ label rule", () => {
		const desktopCss = styles.slice(
			0,
			styles.indexOf("@media (max-width: 900px)"),
		);
		expect(desktopCss).toMatch(/label\.workflow-sidebar-toggle-button/);
		expect(desktopCss).toMatch(/label\.workflow-sidebar-close/);
	});
});
