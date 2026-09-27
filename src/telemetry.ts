import { initializeFaro, getWebInstrumentations } from "@grafana/faro-web-sdk";

/**
 * Consent key for localStorage
 */
const CONSENT_KEY = "telemetry-consent";

/**
 * Environment variable names for Faro configuration
 */
const FARO_URL_ENV_VAR = "VITE_FARO_URL";
const FARO_APP_NAME_ENV_VAR = "VITE_FARO_APP_NAME";

/**
 * Check if user has consented to telemetry
 * @returns boolean indicating if user has consented
 */
export function hasTelemetryConsent(): boolean {
	// Default to true (opted in) if no preference is stored
	const consent = localStorage.getItem(CONSENT_KEY);
	return consent === null ? true : consent === "true";
}

/**
 * Set user's telemetry consent preference
 * @param consent boolean indicating if user has consented
 */
export function setTelemetryConsent(consent: boolean): void {
	localStorage.setItem(CONSENT_KEY, consent.toString());
}

/**
 * Initialize telemetry if conditions are met:
 * 1. User has given consent
 * 2. Required environment variables are present
 */
export function initializeTelemetry(): void {
	// Check if user has consented to telemetry
	if (!hasTelemetryConsent()) {
		console.log("Telemetry consent not given, skipping initialization");
		return;
	}

	// Check if required environment variables are present
	const faroUrl = import.meta.env[FARO_URL_ENV_VAR];
	const appName = import.meta.env[FARO_APP_NAME_ENV_VAR];

	if (!faroUrl || !appName) {
		console.log("Faro configuration not found, running in log-only mode");
		return;
	}

	try {
		// Initialize Faro with web instrumentations
		initializeFaro({
			url: faroUrl,
			app: {
				name: appName,
				version: "1.0.0", // TODO: Use actual app version
			},
			instrumentations: [
				...getWebInstrumentations({
					captureConsole: true,
				}),
			],
		});

		console.log("Faro telemetry initialized successfully");
	} catch (error) {
		console.error("Failed to initialize Faro telemetry:", error);
	}
}

/**
 * Track a custom event
 * @param name Event name
 * @param payload Event payload
 */
export function trackEvent(
	name: string,
	payload: Record<string, unknown>,
): void {
	if (!hasTelemetryConsent()) {
		console.log(`[Telemetry] ${name}:`, JSON.stringify(payload, null, 2));
		return;
	}

	const faroUrl = import.meta.env[FARO_URL_ENV_VAR];
	const appName = import.meta.env[FARO_APP_NAME_ENV_VAR];

	if (!faroUrl || !appName) {
		console.log(`[Telemetry] ${name}:`, JSON.stringify(payload, null, 2));
		return;
	}

	// In a real implementation, we would use Faro's API to send the event
	// For now, we'll just log it since we need to access the Faro instance
	console.log(`[Telemetry] ${name}:`, JSON.stringify(payload, null, 2));
}

/**
 * Track mosaic generation event
 * @param success Whether generation was successful
 * @param duration Duration in milliseconds
 * @param sourceWidth Source image width
 * @param sourceHeight Source image height
 * @param tesseraSize Tessera size
 */
export function trackMosaicGeneration(
	success: boolean,
	duration: number,
	sourceWidth: number,
	sourceHeight: number,
	tesseraSize: number,
): void {
	trackEvent("mosaic_generation", {
		success,
		duration,
		sourceWidth,
		sourceHeight,
		tesseraSize,
	});
}
