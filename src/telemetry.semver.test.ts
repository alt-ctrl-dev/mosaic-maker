import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./version", () => ({
	PACKAGE_VERSION: "1.2.3",
	COMMIT_SHA: "abc1234",
	VERSION_STRING: "v1.2.3+abc1234",
}));

describe("telemetry semver", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it("stamps appVersion with the bare semver, not the display string", async () => {
		vi.stubEnv("VITE_FARO_URL", "");
		vi.stubEnv("VITE_FARO_APP_NAME", "");
		const { trackEvent } = await import("./telemetry");
		const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		trackEvent("test_event", { test: "data" });

		const call = consoleLogSpy.mock.calls.find(
			(args) => args[0] === "[Telemetry] test_event:",
		);
		expect(call).toBeDefined();
		const payload = JSON.parse(call?.[1] as string);
		expect(payload.appVersion).toBe("1.2.3");
		expect(Object.keys(payload)).toEqual(["sessionId", "appVersion", "test"]);
	});
});
