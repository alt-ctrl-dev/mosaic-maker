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
	/** Check if user has given telemetry consent */
	hasConsent(): boolean;

	/** Set user's telemetry consent preference */
	setConsent(consent: boolean): void;

	/** Track when a user views/navigates to a step in the workflow */
	stepViewed(step: TelemetryStep): void;

	/** Track workflow step navigation */
	workflowStepNavigated(from: string, to: string): void;

	/** Track tesserae generation */
	tesseraeGenerated(count: number, duration: number): void;

	/** Track tessera size change */
	tesseraSizeChanged(size: number): void;

	/** Track source image upload */
	sourceImageUploaded(width: number, height: number, fileSize: number): void;

	/** Track mobile menu interaction */
	mobileMenuInteraction(action: string): void;

	/** Track tessera review viewed */
	tesseraReviewViewed(count: number): void;

	/** Track mosaic download */
	mosaicDownloaded(format: string): void;

	/** Track mosaic generation */
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

	/** Track errors */
	errorTracked(
		step: ErrorStep,
		error: unknown,
		context?: Record<string, unknown>,
	): void;

	/** Collect device analytics */
	collectDeviceAnalytics(): Promise<void>;
}
