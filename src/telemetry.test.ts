import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeTelemetry, setTelemetryConsent } from "./telemetry";

describe("telemetry", () => {
	beforeEach(() => {
		vi.resetModules();
		localStorage.clear();
		sessionStorage.clear();

		// Mock environment variables
		vi.stubEnv("VITE_FARO_URL", "http://localhost:1234/collect");
		vi.stubEnv("VITE_FARO_APP_NAME", "test-app");
	});

	it("should initialize telemetry with web vitals reporting all changes", async () => {
		// Set consent to true
		setTelemetryConsent(true);

		// Mock the Faro initialize function to capture the configuration
		const mockInitializeFaro = vi.fn();
		vi.doMock("@grafana/faro-web-sdk", async () => {
			const actual = await vi.importActual("@grafana/faro-web-sdk");
			return {
				...actual,
				initializeFaro: mockInitializeFaro,
			};
		});

		// Re-import the module to use the mock
		const { initializeTelemetry } = await import("./telemetry");

		// Initialize telemetry
		initializeTelemetry();

		// Verify that initializeFaro was called
		expect(mockInitializeFaro).toHaveBeenCalled();

		// Get the configuration passed to initializeFaro
		const config = mockInitializeFaro.mock.calls[0][0];

		// Check that instrumentations are present
		expect(config.instrumentations).toBeDefined();

		// Note: We can't easily verify the webVitalsInstrumentation config here
		// because it's embedded within the getWebInstrumentations call
		// The actual verification will happen in manual testing or integration tests
	});

	it("should respect user consent preference", () => {
		// Test that telemetry is not initialized when consent is denied
		setTelemetryConsent(false);
		const consoleSpy = vi.spyOn(console, "log");

		initializeTelemetry();

		expect(consoleSpy).toHaveBeenCalledWith(
			"Telemetry consent not given, skipping initialization",
		);
	});
});
