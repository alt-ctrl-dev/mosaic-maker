import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { collectDeviceAnalytics } from "./device-analytics";

describe("Device Analytics", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should collect device analytics and log to console", () => {
		Object.defineProperty(navigator, "userAgent", {
			value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			configurable: true,
		});

		Object.defineProperty(navigator, "deviceMemory", {
			value: 8,
			configurable: true,
		});

		Object.defineProperty(screen, "width", {
			value: 1920,
			configurable: true,
		});

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

		Object.defineProperty(crypto, "randomUUID", {
			value: () => "test-uuid-12345",
			configurable: true,
		});

		collectDeviceAnalytics();

		expect(console.log).toHaveBeenCalledWith(
			"Device Analytics:",
			expect.any(String),
		);

		const logData = JSON.parse(vi.mocked(console.log).mock.calls[0][1]);

		expect(logData).toHaveProperty("os");
		expect(logData).toHaveProperty("deviceType");
		expect(logData).toHaveProperty("memory");
		expect(logData).toHaveProperty("screenResolution");
		expect(logData).toHaveProperty("viewportResolution");
		expect(logData).toHaveProperty("deviceId");
		expect(logData.memory).toBe(8);
	});

	it("should report memory as -1 when device memory is unavailable", () => {
		Object.defineProperty(navigator, "userAgent", {
			value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			configurable: true,
		});

		// @ts-expect-error deviceMemory is not in all browsers
		delete navigator.deviceMemory;

		collectDeviceAnalytics();

		const logData = JSON.parse(vi.mocked(console.log).mock.calls[0][1]);

		expect(logData.memory).toBe(-1);
	});
});
