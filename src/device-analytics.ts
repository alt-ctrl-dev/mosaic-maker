/** localStorage key under which the persistent device identifier is stored. */
const DEVICE_ID_STORAGE_KEY = "mosaicMaker.deviceId";

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
 * @returns OS name (Windows, MacOS, Linux, Android, iOS) or "Unknown"
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

/**
 * Returns the physical screen resolution as "width×height".
 */
function getScreenResolution(): string {
	return `${screen.width}×${screen.height}`;
}

/**
 * Returns the viewport (window inner) resolution as "width×height".
 */
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
 * Logs device analytics (OS name and version, device type, memory,
 * screen/viewport resolution, and a persistent device identifier) to the
 * console as formatted JSON.
 */
export async function collectDeviceAnalytics(): Promise<void> {
	const { os, osVersion } = await getOSInfo();

	const analyticsData = {
		os,
		osVersion,
		deviceType: getDeviceType(),
		memory: getMemoryInfo(),
		screenResolution: getScreenResolution(),
		viewportResolution: getViewportResolution(),
		deviceId: getDeviceId(),
	};

	console.log("Device Analytics:", JSON.stringify(analyticsData, null, 2));
}
