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

	it("should use a cryptographically secure fallback when randomUUID is unavailable", () => {
		const getRandomValuesSpy = vi.spyOn(crypto, "getRandomValues");
		vi.spyOn(crypto, "randomUUID").mockReturnValue(
			undefined as unknown as `${string}-${string}-${string}-${string}-${string}`,
		);

		initAnalytics();
		const id = getSessionId();

		expect(getRandomValuesSpy).toHaveBeenCalled();
		expect(id).toMatch(/^session-\d+-[0-9a-f]{32}$/);
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
