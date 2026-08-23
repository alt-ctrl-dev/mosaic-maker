/**
 * Device analytics module for collecting basic device information.
 * This module provides functions to gather and log device information
 * including OS, device type, hardware details, and a unique device identifier.
 */

/**
 * Detects the operating system from the user agent string.
 * @returns The detected operating system or "Unknown"
 */
function getOS(): string {
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
 * Detects the device type from the user agent string.
 * @returns The detected device type or "Unknown"
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
 * Gets screen resolution information.
 * @returns Screen resolution as "width×height"
 */
function getScreenResolution(): string {
	return `${screen.width}×${screen.height}`;
}

/**
 * Gets viewport resolution information.
 * @returns Viewport resolution as "width×height"
 */
function getViewportResolution(): string {
	return `${window.innerWidth}×${window.innerHeight}`;
}

/**
 * Generates a unique device identifier using crypto.randomUUID when available,
 * falling back to a Math.random-based ID otherwise.
 * @returns A unique device identifier
 */
function getDeviceId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}

	return `id-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Logs device analytics (OS, device type, memory, screen/viewport resolution,
 * and a unique device identifier) to the console as formatted JSON.
 */
export function collectDeviceAnalytics(): void {
	const analyticsData = {
		os: getOS(),
		deviceType: getDeviceType(),
		memory: getMemoryInfo(),
		screenResolution: getScreenResolution(),
		viewportResolution: getViewportResolution(),
		deviceId: getDeviceId(),
	};

	console.log("Device Analytics:", JSON.stringify(analyticsData, null, 2));
}
