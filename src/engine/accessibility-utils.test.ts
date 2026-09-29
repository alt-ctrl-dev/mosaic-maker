/**
 * Tests for accessibility utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	moveFocus,
	trapFocus,
	getFocusableElements,
	announce,
	prefersReducedMotion,
	applyReducedMotionClass,
	isEnterKey,
	isSpaceKey,
	isEscapeKey,
	isActivationKey,
} from "./accessibility-utils";

/**
 * Create a container with the given HTML, appended to document.body so
 * that offsetWidth / offsetHeight are computed correctly. The caller
 * should remove the container from the body when done.
 */
function buildContainer(html: string): HTMLElement {
	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);
	return container;
}

describe("Focus functions", () => {
	let containers: HTMLElement[] = [];

	afterEach(() => {
		for (const el of containers) el.remove();
		containers = [];
	});

	function track(container: HTMLElement): HTMLElement {
		containers.push(container);
		return container;
	}

	it("returns an empty array from an empty container", () => {
		const container = track(document.createElement("div"));
		document.body.appendChild(container);
		expect(getFocusableElements(container)).toHaveLength(0);
	});

	it("returns only enabled, visible focusable elements", () => {
		const container = track(
			buildContainer(`
			<a href="/link">Link</a>
			<button>Enabled</button>
			<button disabled>Disabled</button>
			<input hidden />
			<div tabindex="0">Tabbable</div>
			<div tabindex="-1">Not tabbable</div>
		`),
		);
		const results = getFocusableElements(container);
		expect(results).toHaveLength(3);
		expect(results.map((el) => el.tagName)).toEqual(["A", "BUTTON", "DIV"]);
	});

	it("moveFocus returns null for an empty container", () => {
		const container = track(document.createElement("div"));
		document.body.appendChild(container);
		expect(moveFocus(container, null)).toBeNull();
	});

	it("moveFocus returns null when currentElement is not in the container", () => {
		const container = track(buildContainer("<button>One</button>"));
		const unrelatedContainer = track(buildContainer("<button>Other</button>"));
		const unrelated = unrelatedContainer.firstElementChild as HTMLElement;
		expect(moveFocus(container, unrelated)).toBeNull();
	});

	it("moveFocus wraps forward from last to first element", () => {
		const container = track(
			buildContainer("<button>First</button><button>Second</button>"),
		);
		const [first, second] = getFocusableElements(container);
		const result = moveFocus(container, second);
		expect(result).toBe(first);
	});

	it("moveFocus wraps in reverse from first to last element", () => {
		const container = track(
			buildContainer("<button>First</button><button>Second</button>"),
		);
		const [first, last] = getFocusableElements(container);
		const result = moveFocus(container, first, true);
		expect(result).toBe(last);
	});

	it("moveFocus focuses the first element when currentElement is null", () => {
		const container = track(
			buildContainer("<button>First</button><button>Second</button>"),
		);
		const [first] = getFocusableElements(container);
		const result = moveFocus(container, null);
		expect(result).toBe(first);
	});

	it("moveFocus focuses the last element when currentElement is null and reverse is true", () => {
		const container = track(
			buildContainer("<button>First</button><button>Second</button>"),
		);
		const [, last] = getFocusableElements(container);
		const result = moveFocus(container, null, true);
		expect(result).toBe(last);
	});

	it("trapFocus ignores non-Tab key events", () => {
		const container = track(document.createElement("div"));
		document.body.appendChild(container);
		const event = new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
		});
		const preventDefault = vi.spyOn(event, "preventDefault");

		trapFocus(container, event);
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it("trapFocus wraps Tab from last to first element", () => {
		const container = track(
			buildContainer(
				'<button id="first">First</button><button id="last">Last</button>',
			),
		);
		const last = container.querySelector("#last") as HTMLElement;
		last.focus();

		const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
		const preventDefault = vi.spyOn(event, "preventDefault");

		trapFocus(container, event);

		expect(preventDefault).toHaveBeenCalled();
		expect(document.activeElement).toBe(container.querySelector("#first"));
	});

	it("trapFocus wraps Shift+Tab from first to last element", () => {
		const container = track(
			buildContainer(
				'<button id="first">First</button><button id="last">Last</button>',
			),
		);
		const first = container.querySelector("#first") as HTMLElement;
		first.focus();

		const event = new KeyboardEvent("keydown", {
			key: "Tab",
			shiftKey: true,
			bubbles: true,
		});
		const preventDefault = vi.spyOn(event, "preventDefault");

		trapFocus(container, event);

		expect(preventDefault).toHaveBeenCalled();
		expect(document.activeElement).toBe(container.querySelector("#last"));
	});
});

describe("ScreenReaderAnnouncer", () => {
	beforeEach(() => {
		const existingRegions = document.querySelectorAll("[aria-live]");
		existingRegions.forEach((region) => {
			region.remove();
		});
	});

	it("creates and populates a live region", () => {
		announce("Test message");

		const liveRegion = document.querySelector('[aria-live="polite"]');
		expect(liveRegion).toBeTruthy();
		expect(liveRegion?.textContent).toBe("Test message");
	});
});

describe("ReducedMotion", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("detects reduced motion preference", () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-reduced-motion: reduce)",
			})),
		);

		expect(prefersReducedMotion()).toBe(true);
	});

	it("applies the reduced-motion class when preferred", () => {
		const element = document.createElement("div");

		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation((query: string) => ({
				matches: query === "(prefers-reduced-motion: reduce)",
			})),
		);

		applyReducedMotionClass(element);
		expect(element.classList.contains("reduced-motion")).toBe(true);
	});

	it("does not apply the reduced-motion class when not preferred", () => {
		const element = document.createElement("div");

		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockImplementation(() => ({
				matches: false,
			})),
		);

		applyReducedMotionClass(element);
		expect(element.classList.contains("reduced-motion")).toBe(false);
	});

	it("prefersReducedMotion returns false when window is undefined", () => {
		const originalWindow = globalThis.window;
		// @ts-expect-error simulating SSR where window is absent
		delete globalThis.window;

		expect(prefersReducedMotion()).toBe(false);

		globalThis.window = originalWindow;
	});
});

describe("KeyboardUtils", () => {
	it("detects Enter key", () => {
		expect(isEnterKey(new KeyboardEvent("keydown", { key: "Enter" }))).toBe(
			true,
		);
	});

	it("detects Space key", () => {
		expect(isSpaceKey(new KeyboardEvent("keydown", { key: " " }))).toBe(true);
	});

	it("detects Escape key", () => {
		expect(isEscapeKey(new KeyboardEvent("keydown", { key: "Escape" }))).toBe(
			true,
		);
	});

	it("detects activation keys (Enter and Space but not Escape)", () => {
		expect(
			isActivationKey(new KeyboardEvent("keydown", { key: "Enter" })),
		).toBe(true);
		expect(isActivationKey(new KeyboardEvent("keydown", { key: " " }))).toBe(
			true,
		);
		expect(
			isActivationKey(new KeyboardEvent("keydown", { key: "Escape" })),
		).toBe(false);
	});
});
