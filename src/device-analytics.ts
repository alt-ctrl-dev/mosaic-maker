import {
	type DeviceCapacity,
	getDeviceCapacity,
} from "./engine/device-capacity-preflight";

/** Source used to derive OS and platform detail for a device snapshot. */
export type OsSource = "userAgentData" | "userAgent";

/**
 * Device/environment snapshot collected once before the app mounts.
 *
 * Every field sourced from an optional browser API is optional; the snapshot
 * must remain constructible on a browser that supports none of them.
 */
export interface DeviceSnapshot {
	/**
	 * In-memory correlation key grouping events within a single app load.
	 * Never persisted and never derived from device characteristics.
	 */
	sessionId?: string;
	/** Which browser source supplied the OS/platform fields. */
	osSource?: OsSource;
	/** OS/platform name (e.g. "Windows", "macOS"). */
	platform?: string;
	/** OS/platform version string when the browser exposes it. */
	platformVersion?: string;
	/** CPU architecture (e.g. "x86") from high-entropy values. */
	architecture?: string;
	/** CPU bitness (e.g. "64") from high-entropy values. */
	bitness?: string;
	/** Device model when exposed (typically mobile Chromium). */
	model?: string;
	/** Full browser version from high-entropy values. */
	uaFullVersion?: string;
	/** Raw user-agent string, recorded when falling back to `navigator.userAgent`. */
	userAgent?: string;
	/** Physical screen width in pixels. */
	screenWidth?: number;
	/** Physical screen height in pixels. */
	screenHeight?: number;
	/** Screen colour depth in bits per pixel. */
	pixelDepth?: number;
	/** Ratio of physical to CSS pixels. */
	devicePixelRatio?: number;
	/** Viewport width in CSS pixels. */
	viewportWidth?: number;
	/** Viewport height in CSS pixels. */
	viewportHeight?: number;
	/** Approximate device memory in GB, from `getDeviceCapacity()`. */
	deviceMemory?: number;
	/** Logical CPU core count, from `getDeviceCapacity()`. */
	hardwareConcurrency?: number;
	/** IANA timezone name (e.g. "Europe/London"). */
	timeZone?: string;
	/** Preferred browser language (e.g. "en-US"). */
	language?: string;
}

/** High-entropy hints requested from `navigator.userAgentData`. */
const HIGH_ENTROPY_HINTS = [
	"platform",
	"platformVersion",
	"architecture",
	"bitness",
	"model",
	"uaFullVersion",
] as const;

interface UserAgentData {
	getHighEntropyValues(hints: string[]): Promise<{
		platform?: string;
		platformVersion?: string;
		architecture?: string;
		bitness?: string;
		model?: string;
		uaFullVersion?: string;
	}>;
}

function getUserAgentData(): UserAgentData | undefined {
	if (typeof navigator === "undefined") return undefined;
	return (navigator as Navigator & { userAgentData?: UserAgentData })
		.userAgentData;
}

function assignDefined<T extends object>(target: T, source: Partial<T>): void {
	for (const key of Object.keys(source) as (keyof T)[]) {
		const value = source[key];
		if (value !== undefined && value !== "") {
			target[key] = value as T[keyof T];
		}
	}
}

async function collectOsFields(): Promise<Partial<DeviceSnapshot>> {
	const userAgentData = getUserAgentData();

	if (userAgentData) {
		const highEntropy = await userAgentData.getHighEntropyValues([
			...HIGH_ENTROPY_HINTS,
		]);
		return {
			osSource: "userAgentData",
			platform: highEntropy.platform,
			platformVersion: highEntropy.platformVersion,
			architecture: highEntropy.architecture,
			bitness: highEntropy.bitness,
			model: highEntropy.model,
			uaFullVersion: highEntropy.uaFullVersion,
		};
	}

	if (typeof navigator !== "undefined" && navigator.userAgent) {
		return { osSource: "userAgent", userAgent: navigator.userAgent };
	}

	return {};
}

function collectDisplayFields(): Partial<DeviceSnapshot> {
	const fields: Partial<DeviceSnapshot> = {};

	if (typeof screen !== "undefined") {
		fields.screenWidth = screen.width;
		fields.screenHeight = screen.height;
		fields.pixelDepth = screen.pixelDepth;
	}

	if (typeof window !== "undefined") {
		fields.devicePixelRatio = window.devicePixelRatio;
		fields.viewportWidth = window.innerWidth;
		fields.viewportHeight = window.innerHeight;
	}

	return fields;
}

function collectHardwareFields(): Partial<DeviceSnapshot> {
	const capacity: DeviceCapacity = getDeviceCapacity();
	return {
		deviceMemory: capacity.deviceMemory,
		hardwareConcurrency: capacity.hardwareConcurrency,
	};
}

function collectLocaleFields(): Partial<DeviceSnapshot> {
	const fields: Partial<DeviceSnapshot> = {};

	if (typeof Intl !== "undefined") {
		fields.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	}

	if (typeof navigator !== "undefined") {
		fields.language = navigator.language;
	}

	return fields;
}

function generateSessionId(): string | undefined {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return undefined;
}

/**
 * Collect a device/environment snapshot, resolving even when individual
 * sources fail. Unavailable fields are omitted entirely rather than filled
 * with placeholder values.
 */
export async function collectDeviceSnapshot(): Promise<DeviceSnapshot> {
	const snapshot: DeviceSnapshot = {};

	assignDefined(snapshot, { sessionId: generateSessionId() });

	try {
		assignDefined(snapshot, await collectOsFields());
	} catch {
		// OS detail is best-effort; omit it when the source throws.
	}

	assignDefined(snapshot, collectDisplayFields());
	assignDefined(snapshot, collectHardwareFields());
	assignDefined(snapshot, collectLocaleFields());

	return snapshot;
}

/**
 * Single analytics entry point. The console sink is an implementation detail;
 * a later transport (Sentry, Grafana) will be wired behind this signature.
 */
export function track(event: string, payload: object): void {
	console.log(event, JSON.stringify(payload, null, 2));
}

/**
 * Collect the device snapshot and emit it as a single `device_snapshot`
 * analytics event. Never throws: collection failures are swallowed so app
 * mounting is never blocked.
 */
export async function collectDeviceAnalytics(): Promise<void> {
	try {
		const snapshot = await collectDeviceSnapshot();
		track("device_snapshot", snapshot);
	} catch {
		// Analytics must never break app startup.
	}
}
