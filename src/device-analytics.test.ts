import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { collectDeviceAnalytics } from "./device-analytics";
import { VERSION_STRING } from "./version";

const WINDOWS_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function setUserAgent(value: string): void {
	Object.defineProperty(navigator, "userAgent", {
		value,
		configurable: true,
	});
}

function lastLoggedData(): Record<string, unknown> {
	return JSON.parse(vi.mocked(console.log).mock.calls[0][1]);
}

describe("Device Analytics", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		localStorage.clear();

		// Default to user agent parsing unless a test opts into userAgentData.
		Object.defineProperty(navigator, "userAgentData", {
			value: undefined,
			configurable: true,
		});

		setUserAgent(WINDOWS_USER_AGENT);

		Object.defineProperty(navigator, "deviceMemory", {
			value: 8,
			configurable: true,
		});

		Object.defineProperty(screen, "width", { value: 1920, configurable: true });
		Object.defineProperty(screen, "height", {
			value: 1080,
			configurable: true,
		});
		Object.defineProperty(window, "innerWidth", {
			value: 1200,
			configurable: true,
		});
		Object.defineProperty(window, "innerHeight", {
			value: 800,
			configurable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it("collects device analytics and logs the expected values", async () => {
		await collectDeviceAnalytics();

		expect(console.log).toHaveBeenCalledWith(
			"Device Analytics:",
			expect.any(String),
		);

		const logData = lastLoggedData();

		expect(logData.appVersion).toBe(VERSION_STRING);
		expect(logData.os).toBe("Windows");
		expect(logData.deviceType).toBe("Desktop");
		expect(logData.memory).toBe(8);
		expect(logData.screenResolution).toBe("1920×1080");
		expect(logData.viewportResolution).toBe("1200×800");
		expect(typeof logData.deviceId).toBe("string");
	});

	it("reports memory as -1 when device memory is unavailable", async () => {
		// @ts-expect-error deviceMemory is not in all browsers
		delete navigator.deviceMemory;

		await collectDeviceAnalytics();

		expect(lastLoggedData().memory).toBe(-1);
	});

	it("detects MacOS from a macOS user agent", async () => {
		setUserAgent(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
		);

		await collectDeviceAnalytics();

		expect(lastLoggedData().os).toBe("MacOS");
	});

	it("classifies an Android user agent as a Mobile device", async () => {
		setUserAgent(
			"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
		);

		await collectDeviceAnalytics();

		const logData = lastLoggedData();
		expect(logData.os).toBe("Linux");
		expect(logData.deviceType).toBe("Mobile");
	});

	it("persists the device id in localStorage under mosaicMaker.deviceId", async () => {
		await collectDeviceAnalytics();

		const storedId = localStorage.getItem("mosaicMaker.deviceId");
		expect(storedId).not.toBeNull();
		expect(lastLoggedData().deviceId).toBe(storedId);
	});

	it("reuses the persisted device id across sessions", async () => {
		localStorage.setItem("mosaicMaker.deviceId", "persisted-device-id");

		await collectDeviceAnalytics();

		expect(lastLoggedData().deviceId).toBe("persisted-device-id");
		expect(localStorage.getItem("mosaicMaker.deviceId")).toBe(
			"persisted-device-id",
		);
	});

	it("uses navigator.userAgentData high-entropy values for OS detail", async () => {
		Object.defineProperty(navigator, "userAgentData", {
			value: {
				getHighEntropyValues: vi.fn().mockResolvedValue({
					platform: "Windows",
					platformVersion: "15.0.0",
				}),
			},
			configurable: true,
		});

		await collectDeviceAnalytics();

		const logData = lastLoggedData();
		expect(logData.os).toBe("Windows");
		expect(logData.osVersion).toBe("15.0.0");
	});

	it("falls back to user agent parsing when high-entropy values reject", async () => {
		Object.defineProperty(navigator, "userAgentData", {
			value: {
				getHighEntropyValues: vi
					.fn()
					.mockRejectedValue(new Error("not allowed")),
			},
			configurable: true,
		});

		await collectDeviceAnalytics();

		expect(lastLoggedData().os).toBe("Windows");
	});

	it("falls back to user agent parsing when high-entropy platform is absent", async () => {
		Object.defineProperty(navigator, "userAgentData", {
			value: {
				getHighEntropyValues: vi.fn().mockResolvedValue({}),
			},
			configurable: true,
		});

		await collectDeviceAnalytics();

		expect(lastLoggedData().os).toBe("Windows");
	});

	it("omits osVersion when high-entropy values expose no platform version", async () => {
		Object.defineProperty(navigator, "userAgentData", {
			value: {
				getHighEntropyValues: vi.fn().mockResolvedValue({
					platform: "Windows",
					platformVersion: "",
				}),
			},
			configurable: true,
		});

		await collectDeviceAnalytics();

		const logData = lastLoggedData();
		expect(logData.os).toBe("Windows");
		expect(logData.osVersion).toBeUndefined();
	});

	it("omits osVersion when falling back to user agent parsing", async () => {
		await collectDeviceAnalytics();

		expect(lastLoggedData().osVersion).toBeUndefined();
	});

	it("reports os as Unknown for an unrecognized user agent", async () => {
		setUserAgent("CustomBot/1.0");

		await collectDeviceAnalytics();

		const logData = lastLoggedData();
		expect(logData.os).toBe("Unknown");
		expect(logData.deviceType).toBe("Unknown");
	});

	it("classifies an iPad user agent as a Tablet device", async () => {
		setUserAgent(
			"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
		);

		await collectDeviceAnalytics();

		expect(lastLoggedData().deviceType).toBe("Tablet");
	});

	it("generates a non-persistent device id when localStorage is unavailable", async () => {
		const getItem = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("localStorage blocked");
			});

		await collectDeviceAnalytics();

		expect(typeof lastLoggedData().deviceId).toBe("string");
		expect(lastLoggedData().deviceId).not.toBe("");

		getItem.mockRestore();
	});
});
