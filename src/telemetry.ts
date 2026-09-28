import {
	initializeFaro,
	getWebInstrumentations,
	faro,
	LogLevel,
} from "@grafana/faro-web-sdk";
import { PACKAGE_VERSION } from "./version";

const CONSENT_KEY = "telemetry-consent";
const FARO_URL_ENV_VAR = "VITE_FARO_URL";
const FARO_APP_NAME_ENV_VAR = "VITE_FARO_APP_NAME";

function isFaroConfigured(): boolean {
	return (
		Boolean(import.meta.env[FARO_URL_ENV_VAR]) &&
		Boolean(import.meta.env[FARO_APP_NAME_ENV_VAR])
	);
}

/**
 * Check whether user has consented to telemetry.
 * Defaults to true when no preference has been stored.
 */
export function hasTelemetryConsent(): boolean {
	const consent = localStorage.getItem(CONSENT_KEY);
	return consent === null || consent === "true";
}

/** Persist user's telemetry consent preference in localStorage. */
export function setTelemetryConsent(consent: boolean): void {
	localStorage.setItem(CONSENT_KEY, consent.toString());
}

/**
 * Initialize Faro telemetry when consent is granted and the required
 * build-time environment variables (collector URL and app name) are set.
 * When either condition is not met the module runs in log-only mode:
 * custom events are mirrored to the console but nothing leaves the browser.
 */
export function initializeTelemetry(): void {
	if (!hasTelemetryConsent()) {
		console.log("Telemetry consent not given, skipping initialization");
		return;
	}

	const faroUrl = import.meta.env[FARO_URL_ENV_VAR];
	const appName = import.meta.env[FARO_APP_NAME_ENV_VAR];

	if (!faroUrl || !appName) {
		console.log("Faro configuration not found, running in log-only mode");
		return;
	}

	try {
		initializeFaro({
			url: faroUrl,
			app: {
				name: appName,
				version: PACKAGE_VERSION,
			},
			instrumentations: [
				...getWebInstrumentations({
					captureConsole: true,
				}),
			],
			consoleInstrumentation: {
				disabledLevels: [
					LogLevel.DEBUG,
					LogLevel.TRACE,
					LogLevel.LOG,
					LogLevel.INFO,
					LogLevel.WARN,
				],
			},
		});

		console.log("Faro telemetry initialized successfully");
	} catch (error) {
		console.error("Failed to initialize Faro telemetry:", error);
	}
}

/**
 * Track a custom telemetry event.
 * When Faro is configured the event is sent to the collector;
 * otherwise the event payload is logged to the console.
 */
export function trackEvent(
	name: string,
	payload: Record<string, unknown>,
): void {
	const attributes: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		attributes[key] = String(value);
	}
	faro.api.pushEvent(name, attributes);

	if (!isFaroConfigured()) {
		console.log(`[Telemetry] ${name}:`, JSON.stringify(payload, null, 2));
	}
}

/**
 * Track mosaic generation event.
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
