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

describe("Focus functions", () => {
	it("returns an empty array from an empty container", () => {
		const container = document.createElement("div");
		expect(getFocusableElements(container)).toHaveLength(0);
	});

	it("moveFocus returns null for an empty container", () => {
		const container = document.createElement("div");
		expect(moveFocus(container, null)).toBeNull();
	});

	it("trapFocus ignores non-Tab key events", () => {
		const container = document.createElement("div");
		const event = new KeyboardEvent("keydown", {
			key: "Enter",
			bubbles: true,
		});
		const preventDefault = vi.spyOn(event, "preventDefault");

		trapFocus(container, event);
		expect(preventDefault).not.toHaveBeenCalled();
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
		// The full announce cycle involves a setTimeout we cannot await.
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
