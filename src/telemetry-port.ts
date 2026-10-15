import type { MosaicMode } from "./engine/workflow-state";

/**
 * Telemetry step strings for step view tracking.
 * Distinct from the domain WorkflowStep enum.
 */
export type TelemetryStep =
	| "choose_source_image"
	| "tessera_upload"
	| "build_tesserae"
	| "generated_tesserae"
	| "generate_and_preview"
	| "export_mosaic";

/**
 * Error step strings for error tracking.
 */
export type ErrorStep =
	| "source_image_load"
	| "tessera_processing"
	| "tessera_dimension_limit"
	| "tesserae_generation"
	| "tesserae_resize"
	| "mosaic_generation_worker_init"
	| "mosaic_generation_android_fallback"
	| "mosaic_export"
	| "react_rendering";

/**
 * Telemetry service port interface.
 * Defines the contract for telemetry implementations.
 */
export interface TelemetryService {
	hasConsent(): boolean;
	setConsent(consent: boolean): void;

	/** Track when a user views a step in the workflow. */
	stepViewed(step: TelemetryStep): void;

	/** Track workflow step navigation in the sidebar/mobile menu. */
	workflowStepNavigated(
		fromStep: string,
		toStep: string,
		isForward: boolean,
		isBackward: boolean,
	): void;

	/** Track tesserae generation completion. */
	tesseraeGenerated(count: number, duration: number): void;

	/** Track tessera size change. */
	tesseraSizeChanged(size: number): void;

	/** Track source image upload success. */
	sourceImageUploaded(
		width: number,
		height: number,
		fileSize: number,
		fileType: string,
	): void;

	/** Track mobile workflow menu interactions. */
	mobileMenuInteraction(action: string, dialogId: string): void;

	/** Track when the tessera review section is viewed. */
	tesseraReviewViewed(
		tesseraCount: number,
		validCount: number,
		rejectedCount: number,
		isLowVariety: boolean,
		varietyRecommendation: number | null,
		hasAcceptedSupplementation: boolean,
	): void;

	/** Track mosaic download/share. */
	mosaicDownloaded(
		format: string,
		quality: number,
		width: number,
		height: number,
		delivery: string,
	): void;

	/** Track mosaic generation completion. */
	mosaicGenerated(
		success: boolean,
		duration: number,
		sourceWidth: number,
		sourceHeight: number,
		tesseraSize: number,
		mode: MosaicMode,
		executionPath: "worker" | "main_thread",
		fallbackReason?: "android_readback" | "worker_unavailable",
	): void;

	/** Track errors with step attribution. */
	errorTracked(
		step: ErrorStep,
		error: unknown,
		context?: Record<string, unknown>,
	): void;

	/** Collect device analytics (at most once per app lifecycle). */
	collectDeviceAnalytics(): Promise<void>;
}
