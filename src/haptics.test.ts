import { afterEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "./haptics";

describe("vibrate", () => {
	const originalVibrate = navigator.vibrate;

	afterEach(() => {
		Object.defineProperty(navigator, "vibrate", {
			value: originalVibrate,
			configurable: true,
			writable: true,
		});
	});

	it("forwards the pattern to navigator.vibrate when supported", () => {
		const vibrateSpy = vi.fn().mockReturnValue(true);
		Object.defineProperty(navigator, "vibrate", {
			value: vibrateSpy,
			configurable: true,
			writable: true,
		});

		vibrate([30, 50, 30]);

		expect(vibrateSpy).toHaveBeenCalledWith([30, 50, 30]);
	});

	it("does nothing when the Vibration API is unavailable", () => {
		Object.defineProperty(navigator, "vibrate", {
			value: undefined,
			configurable: true,
			writable: true,
		});

		expect(() => vibrate(15)).not.toThrow();
	});

	it("swallows errors from a rejecting vibration implementation", () => {
		Object.defineProperty(navigator, "vibrate", {
			value: () => {
				throw new Error("not allowed");
			},
			configurable: true,
			writable: true,
		});

		expect(() => vibrate(15)).not.toThrow();
	});
});
