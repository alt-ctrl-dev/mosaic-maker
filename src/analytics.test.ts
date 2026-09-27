import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initAnalytics, getSessionId, track } from "./analytics";

describe("Analytics", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// Reset session ID by re-initializing
		initAnalytics();
	});

	it("should initialize with a session ID", () => {
		initAnalytics();
		const id = getSessionId();
		expect(id).toBeTruthy();
		expect(typeof id).toBe("string");
	});

	it("should track events by logging to console", () => {
		initAnalytics();
		track("test-event", { foo: "bar" });

		expect(console.log).toHaveBeenCalledWith(
			"[Analytics] test-event:",
			expect.any(String),
		);
	});
});
