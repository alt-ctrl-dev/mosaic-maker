import type {
	TelemetryService,
	TelemetryStep,
	ErrorStep,
} from "./telemetry-port";
import type { MosaicMode } from "./engine/workflow-state";
import { SEMVER } from "./version";

const CONSENT_KEY = "telemetry-consent";
const SESSION_KEY = "telemetry-session";
const DEVICE_ID_STORAGE_KEY = "mosaicMaker.deviceId";

/**
 * OS name and, when available, its version string.
 */
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

/**
 * Log-only telemetry adapter implementation.
 * Mirrors events to the console when Faro is not configured.
 */
export class LogOnlyTelemetryAdapter implements TelemetryService {
	private workflowSessionId: string;
	private hasCollectedDeviceAnalytics = false;

	constructor() {
		this.workflowSessionId = this.getWorkflowSessionId();
	}

	/**
	 * Identifier for the current user session: one workflow run (upload image →
	 * build tesserae → generate mosaic → download). Stored in sessionStorage so a
	 * reload mid-workflow keeps the same id and closing the tab ends the session.
	 * Every tracked event carries it, which is what stitches the funnel together.
	 */
	private getWorkflowSessionId(): string {
		let id = sessionStorage.getItem(SESSION_KEY);
		if (!id) {
			id = crypto.randomUUID();
			sessionStorage.setItem(SESSION_KEY, id);
		}
		return id;
	}

	hasConsent(): boolean {
		const consent = localStorage.getItem(CONSENT_KEY);
		return consent === null || consent === "true";
	}

	setConsent(consent: boolean): void {
		localStorage.setItem(CONSENT_KEY, consent.toString());
	}

	/**
	 * Track a custom telemetry event.
	 */
	private trackEvent(name: string, payload: Record<string, unknown>): void {
		const attributes: Record<string, string> = {
			sessionId: this.workflowSessionId,
			appVersion: SEMVER,
		};
		for (const [key, value] of Object.entries(payload)) {
			attributes[key] = String(value);
		}

		console.log(`[Telemetry] ${name}:`, JSON.stringify(attributes, null, 2));
	}

	stepViewed(step: TelemetryStep): void {
		this.trackEvent(`step_view_${step}`, {
			step,
		});
	}

	workflowStepNavigated(from: string, to: string): void {
		this.trackEvent("workflow_step_navigate", {
			from,
			to,
		});
	}

	tesseraeGenerated(count: number, duration: number): void {
		this.trackEvent("tesserae_generation", {
			count,
			duration,
		});
	}

	tesseraSizeChanged(size: number): void {
		this.trackEvent("tessera_size_changed", { size });
	}

	sourceImageUploaded(width: number, height: number, fileSize: number): void {
		this.trackEvent("source_image_upload", {
			width,
			height,
			fileSize,
		});
	}

	mobileMenuInteraction(action: string): void {
		this.trackEvent("mobile_workflow_menu_interaction", { action });
	}

	tesseraReviewViewed(count: number): void {
		this.trackEvent("tessera_review_viewed", { count });
	}

	mosaicDownloaded(format: string): void {
		this.trackEvent("mosaic_download", { format });
	}

	mosaicGenerated(
		success: boolean,
		duration: number,
		sourceWidth: number,
		sourceHeight: number,
		tesseraSize: number,
		mode: MosaicMode,
		executionPath: "worker" | "main_thread",
		fallbackReason?: "android_readback" | "worker_unavailable",
	): void {
		this.trackEvent("mosaic_generation", {
			success,
			duration,
			sourceWidth,
			sourceHeight,
			tesseraSize,
			mode,
			executionPath,
			...(fallbackReason && { fallbackReason }),
		});
	}

	errorTracked(
		step: ErrorStep,
		error: unknown,
		context?: Record<string, unknown>,
	): void {
		const errorInstance =
			error instanceof Error ? error : new Error(String(error));
		const payload: Record<string, unknown> = {
			errorName: errorInstance.name,
			errorMessage: errorInstance.message,
			step,
		};
		if (context !== undefined) {
			payload.context = JSON.stringify(context);
		}
		this.trackEvent(`error_${step}`, payload);
	}

	private getUserAgentData(): HighEntropyUserAgentData | undefined {
		return (navigator as { userAgentData?: HighEntropyUserAgentData })
			.userAgentData;
	}

	/**
	 * Parses the operating system name from the user agent string.
	 * @returns OS name (Windows, MacOS, Linux) or "Unknown"
	 */
	private parseOSFromUserAgent(): string {
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
	private async getOSInfo(): Promise<OsInfo> {
		const userAgentData = this.getUserAgentData();

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

		return { os: this.parseOSFromUserAgent() };
	}

	/**
	 * Classifies the device type from the user agent string.
	 * @returns Device type (Mobile, Tablet, Desktop) or "Unknown"
	 */
	private getDeviceType(): string {
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
	private getMemoryInfo(): number {
		if ("deviceMemory" in navigator) {
			// @ts-expect-error deviceMemory is not in all browsers
			return navigator.deviceMemory;
		}
		return -1;
	}

	private getScreenResolution(): string {
		return `${screen.width}×${screen.height}`;
	}

	private getViewportResolution(): string {
		return `${window.innerWidth}×${window.innerHeight}`;
	}

	/**
	 * Returns a device identifier that persists across browser sessions in
	 * localStorage under `mosaicMaker.deviceId`, generating and storing a new one
	 * on first use. When localStorage is unavailable, a fresh identifier is
	 * generated for the current session without persistence.
	 * @returns A stable device identifier
	 */
	private getDeviceId(): string {
		try {
			const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
			if (stored) {
				return stored;
			}

			const deviceId = this.generateDeviceId();
			localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
			return deviceId;
		} catch {
			return this.generateDeviceId();
		}
	}

	/**
	 * Generates a fresh device identifier using `crypto.randomUUID` when available,
	 * falling back to a `Math.random`-based identifier otherwise.
	 * @returns A newly generated device identifier
	 */
	private generateDeviceId(): string {
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}

		return `id-${Math.random().toString(36).slice(2, 11)}`;
	}

	async collectDeviceAnalytics(): Promise<void> {
		if (this.hasCollectedDeviceAnalytics) {
			return;
		}
		this.hasCollectedDeviceAnalytics = true;

		const { os, osVersion } = await this.getOSInfo();

		const deviceInfo: Record<string, unknown> = {
			os,
			deviceType: this.getDeviceType(),
			memory: this.getMemoryInfo(),
			screenResolution: this.getScreenResolution(),
			viewportResolution: this.getViewportResolution(),
			deviceId: this.getDeviceId(),
		};

		if (osVersion !== undefined) {
			deviceInfo.osVersion = osVersion;
		}

		this.trackEvent("device_analytics", deviceInfo);
	}
}
