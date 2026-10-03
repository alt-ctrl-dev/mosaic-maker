import {
	initializeFaro,
	getWebInstrumentations,
	faro,
	LogLevel,
} from "@grafana/faro-web-sdk";
import { VERSION_STRING } from "./version";
import type { MosaicMode } from "./engine/workflow-state";

const CONSENT_KEY = "telemetry-consent";
const SESSION_KEY = "telemetry-session";
const FARO_URL_ENV_VAR = "VITE_FARO_URL";
const FARO_APP_NAME_ENV_VAR = "VITE_FARO_APP_NAME";
const DEVICE_ID_STORAGE_KEY = "mosaicMaker.deviceId";

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
 * Identifier for the current user session: one workflow run (upload image →
 * build tesserae → generate mosaic → download). Stored in sessionStorage so a
 * reload mid-workflow keeps the same id and closing the tab ends the session.
 * Every tracked event carries it, which is what stitches the funnel together.
 */
export function getWorkflowSessionId(): string {
	let id = sessionStorage.getItem(SESSION_KEY);
	if (!id) {
		id = crypto.randomUUID();
		sessionStorage.setItem(SESSION_KEY, id);
	}
	return id;
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

	const environment = import.meta.env.PROD ? "production" : "dev";
	const samplingRate = import.meta.env.SAMPLING_RATE ?? 1;
	try {
		initializeFaro({
			url: faroUrl,
			app: {
				name: appName,
				version: VERSION_STRING,
				environment,
			},
			sessionTracking: {
				samplingRate,
			},
			webVitalsInstrumentation: {
				reportAllChanges: true,
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
	const attributes: Record<string, string> = {
		sessionId: getWorkflowSessionId(),
		appVersion: VERSION_STRING,
	};
	for (const [key, value] of Object.entries(payload)) {
		attributes[key] = String(value);
	}

	if (!isFaroConfigured()) {
		console.log(`[Telemetry] ${name}:`, JSON.stringify(attributes, null, 2));
		return;
	}

	faro.api.pushEvent(name, attributes);
}

/** OS name and, when available, its version string. */
interface OsInfo {
	os: string;
	osVersion?: string;
}

interface HighEntropyUserAgentData {
	getHighEntropyValues(hints: string[]): Promise<{
		platform?: string;
		platformVersion?: string;
	}>;
}

function getUserAgentData(): HighEntropyUserAgentData | undefined {
	return (navigator as { userAgentData?: HighEntropyUserAgentData })
		.userAgentData;
}

/**
 * Parses the operating system name from the user agent string.
 * @returns OS name (Windows, MacOS, Linux) or "Unknown"
 */
function parseOSFromUserAgent(): string {
	const userAgent = navigator.userAgent;

	if (userAgent.includes("Win")) return "Windows";
	if (userAgent.includes("Mac")) return "MacOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Android")) return "Android";
	if (
		userAgent.includes("iOS") ||
		userAgent.includes("iPhone") ||
		userAgent.includes("iPad")
	)
		return "iOS";

	return "Unknown";
}

/**
 * Resolves OS name and version, preferring the high-entropy
 * `navigator.userAgentData` values and falling back to user agent parsing when
 * the API is unavailable or rejects.
 * @returns OS name and, when exposed, its version string
 */
async function getOSInfo(): Promise<OsInfo> {
	const userAgentData = getUserAgentData();

	if (userAgentData) {
		try {
			const highEntropy = await userAgentData.getHighEntropyValues([
				"platform",
				"platformVersion",
			]);
			if (highEntropy.platform) {
				return {
					os: highEntropy.platform,
					osVersion: highEntropy.platformVersion || undefined,
				};
			}
		} catch {
			// High-entropy values are best-effort; fall back to UA parsing.
		}
	}

	return { os: parseOSFromUserAgent() };
}

/**
 * Classifies the device type from the user agent string.
 * @returns Device type (Mobile, Tablet, Desktop) or "Unknown"
 */
function getDeviceType(): string {
	const userAgent = navigator.userAgent;

	if (
		userAgent.includes("Mobile") ||
		userAgent.includes("Android") ||
		userAgent.includes("iPhone")
	) {
		return "Mobile";
	}
	if (userAgent.includes("iPad") || userAgent.includes("Tablet")) {
		return "Tablet";
	}
	if (
		userAgent.includes("Win") ||
		userAgent.includes("Mac") ||
		userAgent.includes("Linux")
	) {
		return "Desktop";
	}

	return "Unknown";
}

/**
 * Gets device memory information if available.
 * @returns Memory in GB, or -1 when device memory is unavailable
 */
function getMemoryInfo(): number {
	if ("deviceMemory" in navigator) {
		// @ts-expect-error deviceMemory is not in all browsers
		return navigator.deviceMemory;
	}
	return -1;
}

function getScreenResolution(): string {
	return `${screen.width}×${screen.height}`;
}

function getViewportResolution(): string {
	return `${window.innerWidth}×${window.innerHeight}`;
}

/**
 * Returns a device identifier that persists across browser sessions in
 * localStorage under `mosaicMaker.deviceId`, generating and storing a new one
 * on first use. When localStorage is unavailable, a fresh identifier is
 * generated for the current session without persistence.
 * @returns A stable device identifier
 */
function getDeviceId(): string {
	try {
		const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
		if (stored) {
			return stored;
		}

		const deviceId = generateDeviceId();
		localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
		return deviceId;
	} catch {
		return generateDeviceId();
	}
}

/**
 * Generates a fresh device identifier using `crypto.randomUUID` when available,
 * falling back to a `Math.random`-based identifier otherwise.
 * @returns A newly generated device identifier
 */
function generateDeviceId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	return `id-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Whether device analytics have already been collected during this app
 * session. Scoped to the module instance so the `device_analytics` event is
 * tracked at most once per app lifecycle.
 */
let hasCollectedDeviceAnalytics = false;

/**
 * Tracks a `device_analytics` event carrying device information (OS name and
 * version, device type, memory, screen/viewport resolution, and a persistent
 * device identifier) as event attributes. Collects at most once per app
 * session; repeated calls after the first are no-ops.
 */
export async function trackDeviceAnalytics(): Promise<void> {
	if (hasCollectedDeviceAnalytics) {
		return;
	}
	hasCollectedDeviceAnalytics = true;

	const { os, osVersion } = await getOSInfo();

	const deviceInfo: Record<string, unknown> = {
		os,
		deviceType: getDeviceType(),
		memory: getMemoryInfo(),
		screenResolution: getScreenResolution(),
		viewportResolution: getViewportResolution(),
		deviceId: getDeviceId(),
	};

	if (osVersion !== undefined) {
		deviceInfo.osVersion = osVersion;
	}

	trackEvent("device_analytics", deviceInfo);
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
	mode: MosaicMode = "photomosaic",
): void {
	trackEvent("mosaic_generation", {
		success,
		duration,
		sourceWidth,
		sourceHeight,
		tesseraSize,
		mode,
	});
}
