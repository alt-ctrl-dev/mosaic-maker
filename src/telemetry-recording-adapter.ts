import type {
	TelemetryService,
	TelemetryStep,
	ErrorStep,
} from "./telemetry-port";
import type { MosaicMode } from "./engine/workflow-state";

const CONSENT_KEY = "telemetry-consent";

/**
 * Recording telemetry adapter implementation.
 * Records events in memory for testing purposes.
 */
export class RecordingTelemetryAdapter implements TelemetryService {
	private workflowSessionId: string;
	private hasCollectedDeviceAnalytics = false;
	public events: Array<{ name: string; payload: Record<string, unknown> }> = [];

	constructor() {
		// Generate a fixed session ID for testing consistency
		this.workflowSessionId = "test-session-id";
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
			appVersion: "test-version",
		};
		for (const [key, value] of Object.entries(payload)) {
			attributes[key] = String(value);
		}

		this.events.push({ name, payload: attributes });
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

	async collectDeviceAnalytics(): Promise<void> {
		if (this.hasCollectedDeviceAnalytics) {
			return;
		}
		this.hasCollectedDeviceAnalytics = true;

		const deviceInfo: Record<string, unknown> = {
			os: "test-os",
			deviceType: "Desktop",
			memory: 8,
			screenResolution: "1920×1080",
			viewportResolution: "1200×800",
			deviceId: "test-device-id",
		};

		this.trackEvent("device_analytics", deviceInfo);
	}

	/** Clear recorded events */
	clear(): void {
		this.events = [];
	}

	/** Get recorded events matching a name pattern */
	getEventsByName(
		name: string,
	): Array<{ name: string; payload: Record<string, unknown> }> {
		return this.events.filter((event) => event.name === name);
	}

	/** Get recorded events matching a name pattern */
	getEventsByNamePattern(
		pattern: RegExp,
	): Array<{ name: string; payload: Record<string, unknown> }> {
		return this.events.filter((event) => pattern.test(event.name));
	}
}
