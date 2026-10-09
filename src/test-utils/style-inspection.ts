/**
 * Helpers for inspecting the stylesheets StyleX injects at runtime in jsdom.
 * jsdom's getComputedStyle neither resolves `var()` references nor applies
 * media queries, so tests inspect the raw declared values instead.
 */

/** A CSS declaration matching an element, with the media query it came from. */
export interface MatchedDeclaration {
	value: string;
	media: string | null;
}

/**
 * Returns every declaration of `property` whose selector matches `element`,
 * walking every stylesheet in the document. Top-level rules report
 * `media: null`; rules inside media queries report the media query text.
 * Selectors jsdom cannot match are skipped.
 */
export function declarationsFor(
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

/** Shorthand for {@link declarationsFor} returning only the declared values. */
export function declaredValuesFor(
	element: Element,
	property: string,
): string[] {
	return declarationsFor(element, property).map(
		(declaration) => declaration.value,
	);
}
