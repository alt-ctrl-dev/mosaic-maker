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
	/** Whether the tessera is supplemented (generated) */
	isSupplemented?: boolean;
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
	/** Collection of uploaded or generated tesserae */
	tesserae: TesseraInfo[];
	/** Number of valid tesserae */
	validTesseraCount: number;
	/** Number of rejected tesserae */
	rejectedTesseraCount: number;
	/** Total number of tesserae processed */
	totalTesseraCount: number;
	/** Whether the collection has low variety */
	isLowVarietyCollection: boolean;
	/** The recommended number of tesserae for good variety */
	varietyRecommendation: number | null;
	/** Whether the user has accepted supplementation */
	hasAcceptedSupplementation: boolean;
	/** Whether to use generated tesserae instead of uploaded ones */
	useGeneratedTesserae: boolean;
	/** Seed for generating reproducible noise tesserae */
	seed: number | null;
	/** Number of generated tesserae to create */
	generatedTesseraCount: number | null;
	/** Whether the generated tesserae need to be regenerated */
	needsRegeneration: boolean;
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
	isLowVarietyCollection: false,
	varietyRecommendation: null,
	hasAcceptedSupplementation: false,
	useGeneratedTesserae: false,
	seed: null,
	generatedTesseraCount: null,
	needsRegeneration: false,
};

/**
 * Calculate the recommended number of tesserae for good variety.
 * 10% of grid cells, capped at 100.
 */
export function getVarietyRecommendation(gridCellCount: number): number {
	const recommendation = Math.max(1, Math.round(gridCellCount * 0.1));
	return Math.min(recommendation, 100);
}

/**
 * Check if a collection has low variety based on valid tessera count vs recommendation.
 */
export function checkLowVariety(
	validTesseraCount: number,
	gridCellCount: number,
): boolean {
	const recommendation = getVarietyRecommendation(gridCellCount);
	return validTesseraCount < recommendation;
}

/**
 * Recalculate variety metrics based on the current workflow state and valid tessera count.
 * Determines if the collection has low variety and calculates the variety recommendation.
 *
 * @param state - The current workflow state containing adjusted tessera size and source image
 * @param validCount - The number of valid tesserae in the collection
 * @returns An object containing whether the collection has low variety and the variety recommendation
 */
function recalculateVarietyMetrics(
	state: WorkflowState,
	validCount: number,
): { isLowVariety: boolean; varietyRecommendation: number | null } {
	if (!state.adjustedTesseraSize || !state.sourceImage) {
		return { isLowVariety: false, varietyRecommendation: null };
	}

	const gridCellCount = calculateGridCellCount(
		state.adjustedTesseraSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	return {
		isLowVariety: checkLowVariety(validCount, gridCellCount),
		varietyRecommendation: getVarietyRecommendation(gridCellCount),
	};
}

/**
 * Update workflow state with a new source image.
 * Validates the source image dimensions and updates the workflow step accordingly.
 *
 * @param state - The current workflow state
 * @param sourceImage - The new source image information
 * @returns Updated workflow state with the new source image and appropriate step
 */
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

/**
 * Update workflow state with a source image error.
 * This is used when source image processing fails.
 *
 * @param state - The current workflow state
 * @param errorMessage - The error message to set
 * @returns Updated workflow state with the error information
 */
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

/**
 * Update workflow state with a requested tessera size.
 * Calculates the adjusted tessera size and determines if the resulting grid is coarse.
 *
 * @param state - The current workflow state
 * @param requestedSize - The tessera size requested by the user
 * @returns Updated workflow state with adjusted tessera size and grid information
 */
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

/**
 * Update workflow state with a new collection of tesserae.
 * Calculates validity counts and variety metrics for the new collection.
 *
 * @param state - The current workflow state
 * @param tesserae - The new collection of tesserae
 * @returns Updated workflow state with the new tesserae collection and metrics
 */
export function updateWorkflowWithTesserae(
	state: WorkflowState,
	tesserae: TesseraInfo[],
): WorkflowState {
	const validCount = tesserae.filter((t) => t.isValid).length;
	const varietyMetrics = recalculateVarietyMetrics(state, validCount);

	return {
		...state,
		tesserae,
		validTesseraCount: validCount,
		rejectedTesseraCount: tesserae.length - validCount,
		totalTesseraCount: tesserae.length,
		isLowVarietyCollection: varietyMetrics.isLowVariety,
		varietyRecommendation: varietyMetrics.varietyRecommendation,
		currentStep: WorkflowStep.REVIEW_TESSERAE,
	};
}

/**
 * Remove a tessera at the specified index from the workflow state.
 * Updates validity counts and variety metrics after removal.
 *
 * @param state - The current workflow state
 * @param tesseraIndex - The index of the tessera to remove
 * @returns Updated workflow state with the tessera removed and metrics recalculated
 */
export function updateWorkflowRemoveTessera(
	state: WorkflowState,
	tesseraIndex: number,
): WorkflowState {
	if (tesseraIndex < 0 || tesseraIndex >= state.tesserae.length) {
		return state;
	}

	const newTesserae = state.tesserae.filter((_, i) => i !== tesseraIndex);
	const validCount = newTesserae.filter((t) => t.isValid).length;
	const varietyMetrics = recalculateVarietyMetrics(state, validCount);

	return {
		...state,
		tesserae: newTesserae,
		validTesseraCount: validCount,
		rejectedTesseraCount: newTesserae.length - validCount,
		totalTesseraCount: newTesserae.length,
		isLowVarietyCollection: varietyMetrics.isLowVariety,
		varietyRecommendation: varietyMetrics.varietyRecommendation,
	};
}

/**
 * Update workflow with supplemented tesserae.
 * Adds generated tesserae to reach the variety recommendation.
 *
 * @param state - The current workflow state
 * @param supplementedTesserae - The tesserae to add to the collection
 * @returns Updated workflow state with supplemented tesserae and metrics recalculated
 */
export function updateWorkflowWithSupplementedTesserae(
	state: WorkflowState,
	supplementedTesserae: TesseraInfo[],
): WorkflowState {
	const allTesserae = [...state.tesserae, ...supplementedTesserae];
	const validCount = allTesserae.filter((t) => t.isValid).length;
	const varietyMetrics = recalculateVarietyMetrics(state, validCount);

	return {
		...state,
		tesserae: allTesserae,
		validTesseraCount: validCount,
		rejectedTesseraCount: allTesserae.length - validCount,
		totalTesseraCount: allTesserae.length,
		isLowVarietyCollection: varietyMetrics.isLowVariety,
		varietyRecommendation: varietyMetrics.varietyRecommendation,
		hasAcceptedSupplementation: true,
	};
}

/**
 * Update workflow to use generated tesserae mode.
 * This switches the workflow to use algorithmically generated tesserae instead of uploaded ones.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with generated tesserae mode enabled
 */
export function updateWorkflowToGeneratedMode(
	state: WorkflowState,
): WorkflowState {
	const seed = state.seed ?? Math.floor(Math.random() * 1000000);

	return {
		...state,
		useGeneratedTesserae: true,
		seed: seed,
		currentStep: WorkflowStep.REVIEW_TESSERAE,
	};
}

/**
 * Update workflow to use uploaded tesserae mode.
 * This switches the workflow back to using uploaded tesserae instead of generated ones.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with uploaded tesserae mode enabled
 */
export function updateWorkflowToUploadMode(
	state: WorkflowState,
): WorkflowState {
	return {
		...state,
		useGeneratedTesserae: false,
		currentStep: WorkflowStep.CHOOSE_TESSERAE,
	};
}

/**
 * Update workflow with a specific seed for noise tesserae generation.
 * This will trigger regeneration of tesserae with the new seed.
 *
 * @param state - The current workflow state
 * @param seed - The seed value for noise generation
 * @returns Updated workflow state with new seed and regeneration flag set
 */
export function updateWorkflowWithSeed(
	state: WorkflowState,
	seed: number,
): WorkflowState {
	return {
		...state,
		seed: seed,
		needsRegeneration: true,
	};
}

/**
 * Update workflow with a new random seed for noise tesserae generation.
 * This generates a new random seed and triggers regeneration of tesserae.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with new random seed and regeneration flag set
 */
export function updateWorkflowWithNewSeed(state: WorkflowState): WorkflowState {
	const newSeed = Math.floor(Math.random() * 1000000);
	return {
		...state,
		seed: newSeed,
		needsRegeneration: true,
	};
}

/**
 * Update workflow with a specific count of tesserae to generate.
 * This will trigger regeneration of tesserae with the new count.
 *
 * @param state - The current workflow state
 * @param count - The number of tesserae to generate
 * @returns Updated workflow state with new tessera count and regeneration flag set
 */
export function updateWorkflowWithGeneratedTesseraCount(
	state: WorkflowState,
	count: number,
): WorkflowState {
	return {
		...state,
		generatedTesseraCount: count,
		needsRegeneration: true,
	};
}

/**
 * Update workflow with newly generated tesserae.
 * This replaces the current tessera collection with the new generated ones.
 *
 * @param state - The current workflow state
 * @param tesserae - The newly generated tesserae collection
 * @returns Updated workflow state with new tesserae and regeneration flag cleared
 */
export function updateWorkflowWithGeneratedTesserae(
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
		needsRegeneration: false,
	};
}
