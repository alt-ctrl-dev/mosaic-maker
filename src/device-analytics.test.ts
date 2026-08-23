import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterEach,
	type Mock,
} from "vitest";
import { collectDeviceAnalytics } from "./device-analytics";

describe("Device Analytics", () => {
	beforeEach(() => {
		// Mock console.log
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore console.log
		vi.restoreAllMocks();
	});

	it("should collect device analytics and log to console", () => {
		// Mock navigator properties
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

		// Mock window properties
		Object.defineProperty(window, "innerWidth", {
			value: 1200,
			configurable: true,
		});

		Object.defineProperty(window, "innerHeight", {
			value: 800,
			configurable: true,
		});

		// Mock crypto.randomUUID
		Object.defineProperty(crypto, "randomUUID", {
			value: () => "test-uuid-12345",
			configurable: true,
		});

		collectDeviceAnalytics();

		// Check that console.log was called with the correct arguments
		expect(console.log).toHaveBeenCalledWith(
			"Device Analytics:",
			expect.any(String),
		);

		// Check that all required information was logged
		const logCalls = (console.log as Mock).mock.calls;
		const logData = JSON.parse(logCalls[0][1]);

		expect(logData).toHaveProperty("os");
		expect(logData).toHaveProperty("deviceType");
		expect(logData).toHaveProperty("memory");
		expect(logData).toHaveProperty("screenResolution");
		expect(logData).toHaveProperty("viewportResolution");
		expect(logData).toHaveProperty("deviceId");
	});
});
