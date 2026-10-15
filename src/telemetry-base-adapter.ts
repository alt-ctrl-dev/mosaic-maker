import type {
	TelemetryService,
	TelemetryStep,
	ErrorStep,
} from "./telemetry-port";
import type { MosaicMode } from "./engine/workflow-state";

const CONSENT_KEY = "telemetry-consent";
const SESSION_KEY = "telemetry-session";
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

/**
 * Resolves a workflow session id from sessionStorage, generating a new one
 * on the first call. Reloads mid-workflow reuse the same id; closing the tab
 * ends the session.
 */
export function resolveSessionId(): string {
	let id = sessionStorage.getItem(SESSION_KEY);
	if (!id) {
		id = crypto.randomUUID();
		sessionStorage.setItem(SESSION_KEY, id);
	}
	return id;
}

/**
 * Shared telemetry adapter base implementing the {@link TelemetryService}
 * port. Subclasses supply the dispatch mechanism; all event shaping,
 * enrichment, consent, and device analytics logic lives here.
 */
export abstract class BaseTelemetryAdapter implements TelemetryService {
	private readonly workflowSessionId: string;
	protected hasCollectedDeviceAnalytics = false;

	constructor(
		workflowSessionId: string,
		private readonly appVersion: string,
	) {
		this.workflowSessionId = workflowSessionId;
	}

	// ── consent ──────────────────────────────────────────────────────────

	hasConsent(): boolean {
		const consent = localStorage.getItem(CONSENT_KEY);
		return consent === null || consent === "true";
	}

	setConsent(consent: boolean): void {
		localStorage.setItem(CONSENT_KEY, consent.toString());
	}

	// ── dispatch hook (subclass responsibility) ──────────────────────────

	/**
	 * Send the fully-enriched event to the target sink. Attributes are
	 * pre-enriched with sessionId and appVersion, and all values are strings.
	 */
	protected abstract emitEvent(
		name: string,
		attributes: Record<string, string>,
	): void;

	// ── enrichment ───────────────────────────────────────────────────────

	protected track(name: string, payload: Record<string, unknown>): void {
		const attributes: Record<string, string> = {
			sessionId: this.workflowSessionId,
			appVersion: this.appVersion,
		};
		for (const [key, value] of Object.entries(payload)) {
			attributes[key] = String(value);
		}
		this.emitEvent(name, attributes);
	}

	// ── event methods ────────────────────────────────────────────────────

	stepViewed(step: TelemetryStep): void {
		this.track(`step_view_${step}`, { step });
	}

	workflowStepNavigated(
		fromStep: string,
		toStep: string,
		isForward: boolean,
		isBackward: boolean,
	): void {
		this.track("workflow_step_navigate", {
			fromStep,
			toStep,
			isForward,
			isBackward,
		});
	}

	tesseraeGenerated(count: number, duration: number): void {
		this.track("tesserae_generation", { count, duration });
	}

	tesseraSizeChanged(size: number): void {
		this.track("tessera_size_changed", { size });
	}

	sourceImageUploaded(
		width: number,
		height: number,
		fileSize: number,
		fileType: string,
	): void {
		this.track("source_image_upload", {
			width,
			height,
			fileSize,
			fileType,
		});
	}

	mobileMenuInteraction(action: string, dialogId: string): void {
		this.track("mobile_workflow_menu_interaction", { action, dialogId });
	}

	tesseraReviewViewed(
		tesseraCount: number,
		validCount: number,
		rejectedCount: number,
		isLowVariety: boolean,
		varietyRecommendation: number | null,
		hasAcceptedSupplementation: boolean,
	): void {
		this.track("tessera_review_viewed", {
			tesseraCount,
			validCount,
			rejectedCount,
			isLowVariety,
			varietyRecommendation,
			hasAcceptedSupplementation,
		});
	}

	mosaicDownloaded(
		format: string,
		quality: number,
		width: number,
		height: number,
		delivery: string,
	): void {
		this.track("mosaic_download", { format, quality, width, height, delivery });
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
		this.track("mosaic_generation", {
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
		this.track(`error_${step}`, payload);
	}

	// ── device analytics ─────────────────────────────────────────────────

	private getUserAgentData(): HighEntropyUserAgentData | undefined {
		return (navigator as { userAgentData?: HighEntropyUserAgentData })
			.userAgentData;
	}

	private parseOSFromUserAgent(): string {
		const ua = navigator.userAgent;

		if (ua.includes("Win")) return "Windows";
		if (ua.includes("Mac")) return "MacOS";
		if (ua.includes("Linux")) return "Linux";
		if (ua.includes("Android")) return "Android";
		if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
			return "iOS";

		return "Unknown";
	}

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

	private getDeviceType(): string {
		const ua = navigator.userAgent;

		if (
			ua.includes("Mobile") ||
			ua.includes("Android") ||
			ua.includes("iPhone")
		) {
			return "Mobile";
		}
		if (ua.includes("iPad") || ua.includes("Tablet")) {
			return "Tablet";
		}
		if (ua.includes("Win") || ua.includes("Mac") || ua.includes("Linux")) {
			return "Desktop";
		}

		return "Unknown";
	}

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

		this.track("device_analytics", deviceInfo);
	}
}
