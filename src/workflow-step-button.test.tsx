import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";

/**
 * Returns every CSS declaration for `property` that applies to `element`,
 * gathered by walking the stylesheets StyleX injects at runtime and matching
 * selectors. jsdom's getComputedStyle does not resolve `var()` references, so
 * the raw declared values are inspected directly instead.
 */
function declaredValuesFor(element: Element, property: string): string[] {
	const values: string[] = [];
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSStyleRule)) continue;
			let matches = false;
			try {
				matches = element.matches(rule.selectorText);
			} catch {
				continue;
			}
			if (!matches) continue;
			const value = rule.style.getPropertyValue(property);
			if (value) values.push(value);
		}
	}
	return values;
}

describe("workflow-step-button styling", () => {
	it("uses secondary background and color for resting state", () => {
		render(<App />);

		const button = screen.getAllByRole("button", {
			name: /choose source image/i,
		})[0];
		expect(button).toBeDefined();

		expect(declaredValuesFor(button, "background-color")).toContain(
			tokens.secondary,
		);
		expect(declaredValuesFor(button, "color")).toContain(tokens.onSecondary);
	});
});
