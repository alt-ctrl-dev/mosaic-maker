import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./components/Dialog";
import { tokens } from "./styles/tokens.stylex";

interface MatchedDeclaration {
	value: string;
	media: string | null;
}

/**
 * Returns every declaration of `property` matching `element`, walking the
 * stylesheets StyleX injects at runtime. Media-query rules report their media
 * query text; top-level rules report `null`. jsdom's getComputedStyle ignores
 * media queries, so the raw declared values are inspected directly instead.
 */
function declarationsFor(
	element: Element,
	property: string,
): MatchedDeclaration[] {
	const matched: MatchedDeclaration[] = [];

	const checkRule = (rule: CSSRule, media: string | null) => {
		if (!(rule instanceof CSSStyleRule)) return;
		const value = rule.style.getPropertyValue(property);
		if (!value) return;
		try {
			if (!element.matches(rule.selectorText)) return;
		} catch {
			return;
		}
		matched.push({ value, media });
	};

	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSMediaRule) {
				for (const inner of Array.from(rule.cssRules)) {
					checkRule(inner, rule.media.mediaText);
				}
			} else {
				checkRule(rule, null);
			}
		}
	}

	return matched;
}

function renderDialog(): HTMLElement[] {
	render(
		<Dialog dialogId="mobile-workflow-menu" ariaLabel="Toggle workflow steps">
			<div />
		</Dialog>,
	);
	return screen.getAllByLabelText("Toggle workflow steps");
}

describe("sidebar toggle visibility", () => {
	it("renders the toggle controls as button elements", () => {
		const buttons = renderDialog();

		expect(buttons.length).toBe(2);
		for (const button of buttons) {
			expect(button.tagName).toBe("BUTTON");
			expect((button as HTMLButtonElement).type).toBe("button");
		}
	});

	it("hides the toggle controls on desktop (> 900px)", () => {
		const buttons = renderDialog();

		for (const button of buttons) {
			expect(declarationsFor(button, "display")).toContainEqual({
				value: "none",
				media: null,
			});
		}
	});

	it("shows the toggle controls on mobile (<= 900px)", () => {
		const buttons = renderDialog();

		for (const button of buttons) {
			expect(
				declarationsFor(button, "display").some(
					(declaration) =>
						declaration.value === "block" &&
						declaration.media?.includes("max-width: 900px"),
				),
			).toBe(true);
		}
	});

	it("gives the mobile toggle its own visible background", () => {
		const [toggleButton] = renderDialog();

		expect(
			declarationsFor(toggleButton, "background-color").some(
				(declaration) =>
					declaration.value === tokens.primary &&
					declaration.media?.includes("max-width: 900px"),
			),
		).toBe(true);
	});
});
