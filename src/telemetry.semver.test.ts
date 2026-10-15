import { describe, it, expect, vi } from "vitest";

// Mock the version module to simulate build-time values
vi.mock("./version", () => ({
	PACKAGE_VERSION: "1.2.3",
	COMMIT_SHA: "abc1234",
	VERSION_STRING: "v1.2.3+abc1234",
}));

describe("telemetry semver", () => {
	it("should use bare semver for telemetry grouping, not full version with commit", async () => {
		// This test will verify that telemetry uses PACKAGE_VERSION (bare semver)
		// instead of VERSION_STRING (with commit) for app version grouping
		const { trackEvent } = await import("./telemetry");

		// Mock console.log to capture telemetry output
		const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		// Track an event
		trackEvent("test_event", { test: "data" });

		// Check that the appVersion attribute uses the bare semver
		const call = consoleLogSpy.mock.calls.find(
			(args) => args[0] === "[Telemetry] test_event:",
		);
		expect(call).toBeDefined();
		const payload = JSON.parse(call?.[1] as string);

		// This is what we WANT - bare semver for stable grouping
		expect(payload.appVersion).toBe("1.2.3");

		consoleLogSpy.mockRestore();
	});
});
