import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectDeviceSnapshot, track } from "./device-analytics";

interface NavigatorOverrides {
	userAgent?: string;
	language?: string;
	deviceMemory?: number;
	hardwareConcurrency?: number;
	userAgentData?: {
		getHighEntropyValues: (hints: string[]) => Promise<Record<string, string>>;
	};
}

function stubNavigator(overrides: NavigatorOverrides): void {
	for (const [key, value] of Object.entries(overrides)) {
		Object.defineProperty(navigator, key, {
			value,
			configurable: true,
		});
	}
}

function clearNavigatorProp(key: string): void {
	Object.defineProperty(navigator, key, {
		value: undefined,
		configurable: true,
	});
}

describe("Device Analytics", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		clearNavigatorProp("userAgentData");
	});

	it("collects high-entropy OS fields in a full-support environment", async () => {
		stubNavigator({
			deviceMemory: 8,
			hardwareConcurrency: 12,
			language: "en-US",
			userAgentData: {
				getHighEntropyValues: async () => ({
					platform: "Windows",
					platformVersion: "15.0.0",
					architecture: "x86",
					bitness: "64",
					uaFullVersion: "120.0.0.0",
				}),
			},
		});

		const snapshot = await collectDeviceSnapshot();

		expect(snapshot.osSource).toBe("userAgentData");
		expect(snapshot.platform).toBe("Windows");
		expect(snapshot.platformVersion).toBe("15.0.0");
		expect(snapshot.architecture).toBe("x86");
		expect(snapshot.bitness).toBe("64");
		expect(snapshot.uaFullVersion).toBe("120.0.0.0");
		expect(snapshot.userAgent).toBeUndefined();
		expect(snapshot.deviceMemory).toBe(8);
		expect(snapshot.hardwareConcurrency).toBe(12);
		expect(snapshot.language).toBe("en-US");
		expect(typeof snapshot.timeZone).toBe("string");
	});

	it("falls back to the user-agent string when userAgentData is absent", async () => {
		clearNavigatorProp("userAgentData");
		stubNavigator({
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
		});

		const snapshot = await collectDeviceSnapshot();

		expect(snapshot.osSource).toBe("userAgent");
		expect(snapshot.userAgent).toContain("Macintosh");
		expect(snapshot.platform).toBeUndefined();
	});

	it("resolves and omits OS fields when a source throws", async () => {
		stubNavigator({
			userAgentData: {
				getHighEntropyValues: async () => {
					throw new Error("blocked");
				},
			},
		});

		const snapshot = await collectDeviceSnapshot();

		expect(snapshot.osSource).toBeUndefined();
		expect(snapshot.platform).toBeUndefined();
		// The rest of the snapshot still resolves.
		expect(typeof snapshot.timeZone).toBe("string");
	});

	it("generates a fresh session id per collection", async () => {
		const first = await collectDeviceSnapshot();
		const second = await collectDeviceSnapshot();

		expect(first.sessionId).toBeDefined();
		expect(second.sessionId).toBeDefined();
		expect(first.sessionId).not.toBe(second.sessionId);
	});

	it("does not persist any value to web storage", async () => {
		const localSetSpy = vi.spyOn(Storage.prototype, "setItem");

		await collectDeviceSnapshot();

		expect(localSetSpy).not.toHaveBeenCalled();
	});

	it("emits the payload through track as JSON", () => {
		track("device_snapshot", { sessionId: "abc" });

		expect(console.log).toHaveBeenCalledWith(
			"device_snapshot",
			JSON.stringify({ sessionId: "abc" }, null, 2),
		);
	});
});
