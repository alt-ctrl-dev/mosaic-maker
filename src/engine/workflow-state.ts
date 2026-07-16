import type { SourceImageInfo } from "./image-processing";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
	isCoarseGrid,
} from "./tessera-sizing";

/**
 * Information about a tessera that has been processed for the mosaic.
 */
export interface TesseraInfo {
	/** The original file object */
	file: File;
	/** The original file name */
	fileName: string;
	/** Whether the tessera is valid for use */
	isValid: boolean;
	/** Error message if tessera is invalid */
	error: string | null;
	/** Whether the tessera has low resolution */
	isLowResolution: boolean;
	/** The processed image data URL for preview */
	previewUrl: string | null;
}

/**
 * Represents the current state of the mosaic creation workflow.
 */
export interface WorkflowState {
	/** The current step in the workflow */
	currentStep: WorkflowStep;
	/** Information about the selected source image, if any */
	sourceImage: SourceImageInfo | null;
	/** The tessera size requested by the user */
	requestedTesseraSize: number | null;
	/** The adjusted tessera size after validation */
	adjustedTesseraSize: number | null;
	/** Whether the adjusted tessera size results in a coarse grid */
	isCoarseGrid: boolean;
	/** Whether the source image has valid dimensions for tessera sizing */
	hasValidSourceDimensions: boolean;
	/** Error message if source image processing failed */
	sourceImageError: string | null;
	/** Collection of uploaded tesserae */
	tesserae: TesseraInfo[];
	/** Number of valid tesserae */
	validTesseraCount: number;
	/** Number of rejected tesserae */
	rejectedTesseraCount: number;
	/** Total number of tesserae processed */
	totalTesseraCount: number;
}

/**
 * Workflow steps.
 */
export enum WorkflowStep {
	CHOOSE_SOURCE_IMAGE,
	SET_TESSERA_SIZE,
	CHOOSE_TESSERAE,
	REVIEW_TESSERAE,
	GENERATE_AND_PREVIEW,
	EXPORT_MOSAIC,
}

/**
 * Initial workflow state.
 */
export const INITIAL_WORKFLOW_STATE: WorkflowState = {
	currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
	sourceImage: null,
	requestedTesseraSize: null,
	adjustedTesseraSize: null,
	isCoarseGrid: false,
	hasValidSourceDimensions: false,
	sourceImageError: null,
	tesserae: [],
	validTesseraCount: 0,
	rejectedTesseraCount: 0,
	totalTesseraCount: 0,
};

export function updateWorkflowWithSourceImage(
	state: WorkflowState,
	sourceImage: SourceImageInfo,
): WorkflowState {
	const hasValidDimensions = hasValidTesseraSizes(
		sourceImage.width,
		sourceImage.height,
	);

	if (!hasValidDimensions) {
		return {
			...state,
			sourceImage,
			hasValidSourceDimensions: false,
			sourceImageError:
				"The selected image has no valid tessera sizes (no common divisors above 8 pixels). Please select a different image.",
			currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
		};
	}

	return {
		...state,
		sourceImage,
		hasValidSourceDimensions: true,
		sourceImageError: null,
		currentStep: WorkflowStep.SET_TESSERA_SIZE,
	};
}

export function updateWorkflowWithSourceImageError(
	state: WorkflowState,
	errorMessage: string,
): WorkflowState {
	return {
		...state,
		sourceImage: null,
		hasValidSourceDimensions: false,
		sourceImageError: errorMessage,
	};
}

export function updateWorkflowWithTesseraSize(
	state: WorkflowState,
	requestedSize: number,
): WorkflowState {
	if (!state.sourceImage || !state.hasValidSourceDimensions) {
		return state;
	}

	const adjustedSize = calculateAdjustedTesseraSize(
		requestedSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	if (adjustedSize === null) {
		// This should not happen if hasValidSourceDimensions is true
		return {
			...state,
			requestedTesseraSize: requestedSize,
			adjustedTesseraSize: null,
			isCoarseGrid: false,
		};
	}

	const cellCount = calculateGridCellCount(
		adjustedSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	return {
		...state,
		requestedTesseraSize: requestedSize,
		adjustedTesseraSize: adjustedSize,
		isCoarseGrid: isCoarseGrid(cellCount),
		currentStep: WorkflowStep.CHOOSE_TESSERAE,
	};
}

export function updateWorkflowWithTesserae(
	state: WorkflowState,
	tesserae: TesseraInfo[],
): WorkflowState {
	const validCount = tesserae.filter((t) => t.isValid).length;

	return {
		...state,
		tesserae,
		validTesseraCount: validCount,
		rejectedTesseraCount: tesserae.length - validCount,
		totalTesseraCount: tesserae.length,
		currentStep: WorkflowStep.REVIEW_TESSERAE,
	};
}

export function updateWorkflowRemoveTessera(
	state: WorkflowState,
	tesseraIndex: number,
): WorkflowState {
	if (tesseraIndex < 0 || tesseraIndex >= state.tesserae.length) {
		return state;
	}

	const newTesserae = state.tesserae.filter((_, i) => i !== tesseraIndex);
	const validCount = newTesserae.filter((t) => t.isValid).length;

	return {
		...state,
		tesserae: newTesserae,
		validTesseraCount: validCount,
		rejectedTesseraCount: newTesserae.length - validCount,
		totalTesseraCount: newTesserae.length,
	};
}
