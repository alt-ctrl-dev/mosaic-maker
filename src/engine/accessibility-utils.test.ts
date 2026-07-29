/**
 * Tests for accessibility utilities.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
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
	it("should handle empty container", () => {
		const container = document.createElement("div");
		const focusable = getFocusableElements(container);
		expect(focusable).toHaveLength(0);
	});

	// Note: Focus testing in JSDOM is limited due to lack of full browser implementation
	// These tests validate the logic rather than full browser behavior
});

describe("ScreenReaderAnnouncer", () => {
	beforeEach(() => {
		// Clear any existing live regions
		const existingRegions = document.querySelectorAll("[aria-live]");
		existingRegions.forEach((region) => {
			if (region.parentNode) {
				region.parentNode.removeChild(region);
			}
		});
	});

	it("should create and use a live region", () => {
		announce("Test message");

		const liveRegion = document.querySelector('[aria-live="polite"]');
		expect(liveRegion).toBeTruthy();
		// We can't easily test the text content in this environment
	});
});

describe("ReducedMotion", () => {
	it("should detect reduced motion preference", () => {
		// Mock the matchMedia function
		const mockMatchMedia = vi.fn().mockImplementation((query) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
		}));
		vi.stubGlobal("matchMedia", mockMatchMedia);

		expect(prefersReducedMotion()).toBe(true);

		// Restore original matchMedia
		vi.unstubAllGlobals();
	});

	it("should apply reduced motion class", () => {
		const element = document.createElement("div");

		// Mock the matchMedia function to return true
		const mockMatchMedia = vi.fn().mockImplementation((query) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
		}));
		vi.stubGlobal("matchMedia", mockMatchMedia);

		applyReducedMotionClass(element);
		expect(element.classList.contains("reduced-motion")).toBe(true);

		// Restore original matchMedia
		vi.unstubAllGlobals();
	});

	it("should not apply reduced motion class when not preferred", () => {
		const element = document.createElement("div");

		// Mock the matchMedia function to return false
		const mockMatchMedia = vi.fn().mockImplementation(() => ({
			matches: false,
		}));
		vi.stubGlobal("matchMedia", mockMatchMedia);

		applyReducedMotionClass(element);
		expect(element.classList.contains("reduced-motion")).toBe(false);

		// Restore original matchMedia
		vi.unstubAllGlobals();
	});
});

describe("KeyboardUtils", () => {
	it("should detect Enter key", () => {
		const event = new KeyboardEvent("keydown", { key: "Enter" });
		expect(isEnterKey(event)).toBe(true);
	});

	it("should detect Space key", () => {
		const event = new KeyboardEvent("keydown", { key: " " });
		expect(isSpaceKey(event)).toBe(true);
	});

	it("should detect Escape key", () => {
		const event = new KeyboardEvent("keydown", { key: "Escape" });
		expect(isEscapeKey(event)).toBe(true);
	});

	it("should detect activation keys", () => {
		const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
		const spaceEvent = new KeyboardEvent("keydown", { key: " " });
		const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });

		expect(isActivationKey(enterEvent)).toBe(true);
		expect(isActivationKey(spaceEvent)).toBe(true);
		expect(isActivationKey(escapeEvent)).toBe(false);
	});
});
