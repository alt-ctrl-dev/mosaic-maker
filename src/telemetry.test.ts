import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	hasTelemetryConsent,
	setTelemetryConsent,
	initializeTelemetry,
	trackEvent,
	trackMosaicGeneration,
	getWorkflowSessionId,
} from "./telemetry";
import { VERSION_STRING } from "./version";

describe("telemetry", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
		localStorage.clear();
		sessionStorage.clear();
		vi.stubEnv("VITE_FARO_URL", "");
		vi.stubEnv("VITE_FARO_APP_NAME", "");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	describe("hasTelemetryConsent", () => {
		it("should return true by default when no consent is stored", () => {
			expect(hasTelemetryConsent()).toBe(true);
		});

		it("should return false when consent is explicitly denied", () => {
			setTelemetryConsent(false);
			expect(hasTelemetryConsent()).toBe(false);
		});

		it("should return true when consent is explicitly granted", () => {
			setTelemetryConsent(true);
			expect(hasTelemetryConsent()).toBe(true);
		});
	});

	describe("setTelemetryConsent", () => {
		it("should store consent preference in localStorage", () => {
			setTelemetryConsent(false);
			expect(localStorage.getItem("telemetry-consent")).toBe("false");

			setTelemetryConsent(true);
			expect(localStorage.getItem("telemetry-consent")).toBe("true");
		});
	});

	describe("initializeTelemetry", () => {
		it("should not initialize when consent is denied", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(false);
			initializeTelemetry();
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"Telemetry consent not given, skipping initialization",
			);
		});

		it("should run in log-only mode when environment variables are missing", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(true);
			initializeTelemetry();
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"Faro configuration not found, running in log-only mode",
			);
		});

		it("should enable CLS reporting via webVitalsInstrumentation", async () => {
			vi.stubEnv("VITE_FARO_URL", "http://localhost:1234/collect");
			vi.stubEnv("VITE_FARO_APP_NAME", "test-app");
			setTelemetryConsent(true);

			const mockInitializeFaro = vi.fn();
			vi.doMock("@grafana/faro-web-sdk", async () => {
				const actual = await vi.importActual("@grafana/faro-web-sdk");
				return {
					...actual,
					initializeFaro: mockInitializeFaro,
					getWebInstrumentations: vi.fn(() => []),
				};
			});

			const { initializeTelemetry } = await import("./telemetry");
			initializeTelemetry();

			expect(mockInitializeFaro).toHaveBeenCalledWith(
				expect.objectContaining({
					webVitalsInstrumentation: { reportAllChanges: true },
				}),
			);
		});
	});

	describe("getWorkflowSessionId", () => {
		it("should reuse one id per tab and start a new one per session", () => {
			const first = getWorkflowSessionId();
			expect(first).toBeTruthy();
			expect(getWorkflowSessionId()).toBe(first);

			sessionStorage.clear();
			expect(getWorkflowSessionId()).not.toBe(first);
		});
	});

	describe("trackEvent", () => {
		it("should log to console when consent is denied", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(false);
			trackEvent("test_event", { test: "data" });
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Telemetry] test_event:",
				JSON.stringify(
					{
						sessionId: getWorkflowSessionId(),
						appVersion: VERSION_STRING,
						test: "data",
					},
					null,
					2,
				),
			);
		});

		it("should stamp every event with the workflow session id and app version", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(true);
			const sessionId = getWorkflowSessionId();
			trackEvent("source_image_upload", { width: 100 });
			trackEvent("mosaic_download", { format: "png" });
			for (const call of consoleLogSpy.mock.calls) {
				expect(call[1]).toContain(sessionId);
				expect(call[1]).toContain(VERSION_STRING);
			}
		});

		it("should log to console when environment variables are missing", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(true);
			trackEvent("test_event", { test: "data" });
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Telemetry] test_event:",
				JSON.stringify(
					{
						sessionId: getWorkflowSessionId(),
						appVersion: VERSION_STRING,
						test: "data",
					},
					null,
					2,
				),
			);
		});
	});

	describe("trackDeviceAnalytics", () => {
		const WINDOWS_USER_AGENT =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

		function setUserAgent(value: string): void {
			Object.defineProperty(navigator, "userAgent", {
				value,
				configurable: true,
			});
		}

		function loggedDeviceAttributes(
			calls: unknown[][],
		): Record<string, unknown> {
			const call = calls.find(
				(args) => args[0] === "[Telemetry] device_analytics:",
			);
			if (!call) {
				throw new Error("device_analytics event was not logged");
			}
			return JSON.parse(call[1] as string);
		}

		beforeEach(() => {
			Object.defineProperty(navigator, "userAgentData", {
				value: undefined,
				configurable: true,
			});
			setUserAgent(WINDOWS_USER_AGENT);
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
		});

		it("tracks a device_analytics event with device info as attributes", async () => {
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.appVersion).toBe(VERSION_STRING);
			expect(attributes.sessionId).toBe(getWorkflowSessionId());
			expect(attributes.os).toBe("Windows");
			expect(attributes.deviceType).toBe("Desktop");
			expect(attributes.memory).toBe("8");
			expect(attributes.screenResolution).toBe("1920×1080");
			expect(attributes.viewportResolution).toBe("1200×800");
			expect(typeof attributes.deviceId).toBe("string");
		});

		it("collects device analytics only once per app session", async () => {
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();
			await trackDeviceAnalytics();

			const deviceEvents = consoleLogSpy.mock.calls.filter(
				(args) => args[0] === "[Telemetry] device_analytics:",
			);
			expect(deviceEvents).toHaveLength(1);
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
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.os).toBe("Windows");
			expect(attributes.osVersion).toBe("15.0.0");
		});

		it("omits osVersion when falling back to user agent parsing", async () => {
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.osVersion).toBeUndefined();
		});

		it("persists the device id in localStorage under mosaicMaker.deviceId", async () => {
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const storedId = localStorage.getItem("mosaicMaker.deviceId");
			expect(storedId).not.toBeNull();
			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).deviceId).toBe(
				storedId,
			);
		});

		it("reuses the persisted device id across sessions", async () => {
			localStorage.setItem("mosaicMaker.deviceId", "persisted-device-id");
			const { trackDeviceAnalytics } = await import("./telemetry");

			await trackDeviceAnalytics();

			expect(localStorage.getItem("mosaicMaker.deviceId")).toBe(
				"persisted-device-id",
			);
		});

		it("reports memory as -1 when device memory is unavailable", async () => {
			// @ts-expect-error deviceMemory is not in all browsers
			delete navigator.deviceMemory;
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).memory).toBe(
				"-1",
			);
		});

		it("detects MacOS from a macOS user agent", async () => {
			setUserAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			);
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).os).toBe("MacOS");
		});

		it("classifies an Android user agent as a Mobile device", async () => {
			setUserAgent(
				"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
			);
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.os).toBe("Linux");
			expect(attributes.deviceType).toBe("Mobile");
		});

		it("classifies an iPad user agent as a Tablet device", async () => {
			setUserAgent(
				"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
			);
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).deviceType).toBe(
				"Tablet",
			);
		});

		it("reports os as Unknown for an unrecognized user agent", async () => {
			setUserAgent("CustomBot/1.0");
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.os).toBe("Unknown");
			expect(attributes.deviceType).toBe("Unknown");
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
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).os).toBe(
				"Windows",
			);
		});

		it("falls back to user agent parsing when high-entropy platform is absent", async () => {
			Object.defineProperty(navigator, "userAgentData", {
				value: {
					getHighEntropyValues: vi.fn().mockResolvedValue({}),
				},
				configurable: true,
			});
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			expect(loggedDeviceAttributes(consoleLogSpy.mock.calls).os).toBe(
				"Windows",
			);
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
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const attributes = loggedDeviceAttributes(consoleLogSpy.mock.calls);
			expect(attributes.os).toBe("Windows");
			expect(attributes.osVersion).toBeUndefined();
		});

		it("generates a non-persistent device id when localStorage is unavailable", async () => {
			const originalGetItem = Storage.prototype.getItem;
			const getItem = vi
				.spyOn(Storage.prototype, "getItem")
				.mockImplementation(function (this: Storage, key: string) {
					if (this === localStorage && key === "mosaicMaker.deviceId") {
						throw new Error("localStorage blocked");
					}
					return originalGetItem.call(this, key);
				});
			const { trackDeviceAnalytics } = await import("./telemetry");
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});

			await trackDeviceAnalytics();

			const deviceId = loggedDeviceAttributes(consoleLogSpy.mock.calls)
				.deviceId as string;
			expect(typeof deviceId).toBe("string");
			expect(deviceId).not.toBe("");

			getItem.mockRestore();
		});
	});

	describe("trackMosaicGeneration", () => {
		it("should track mosaic generation event with provided parameters", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			trackMosaicGeneration(true, 1000, 1920, 1080, 16);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Telemetry] mosaic_generation:",
				JSON.stringify(
					{
						sessionId: getWorkflowSessionId(),
						appVersion: VERSION_STRING,
						success: "true",
						duration: "1000",
						sourceWidth: "1920",
						sourceHeight: "1080",
						tesseraSize: "16",
						mode: "photomosaic",
					},
					null,
					2,
				),
			);
		});
	});
});
