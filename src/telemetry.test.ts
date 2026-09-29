import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	hasTelemetryConsent,
	setTelemetryConsent,
	initializeTelemetry,
	trackEvent,
	trackMosaicGeneration,
} from "./telemetry";

describe("telemetry", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
		// Tests assume no Faro config; .env may provide one, so clear it.
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
				JSON.stringify({ test: "data" }, null, 2),
			);
		});

		it("should log to console when environment variables are missing", () => {
			const consoleLogSpy = vi
				.spyOn(console, "log")
				.mockImplementation(() => {});
			setTelemetryConsent(true);
			trackEvent("test_event", { test: "data" });
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Telemetry] test_event:",
				JSON.stringify({ test: "data" }, null, 2),
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
						success: true,
						duration: 1000,
						sourceWidth: 1920,
						sourceHeight: 1080,
						tesseraSize: 16,
					},
					null,
					2,
				),
			);
		});
	});
});
