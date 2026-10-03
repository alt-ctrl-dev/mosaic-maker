import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	hasTelemetryConsent,
	setTelemetryConsent,
	initializeTelemetry,
	trackEvent,
	trackMosaicGeneration,
	getWorkflowSessionId,
} from "./telemetry";

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
					{ sessionId: getWorkflowSessionId(), test: "data" },
					null,
					2,
				),
			);
		});

		it("should stamp every event with the workflow session id", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(true);
			const sessionId = getWorkflowSessionId();
			trackEvent("source_image_upload", { width: 100 });
			trackEvent("mosaic_download", { format: "png" });
			for (const call of consoleLogSpy.mock.calls) {
				expect(call[1]).toContain(sessionId);
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
					{ sessionId: getWorkflowSessionId(), test: "data" },
					null,
					2,
				),
			);
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
						success: "true",
						duration: "1000",
						sourceWidth: "1920",
						sourceHeight: "1080",
						tesseraSize: "16",
					},
					null,
					2,
				),
			);
		});
	});
});
