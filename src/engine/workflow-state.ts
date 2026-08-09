import type { ExportFormat } from "./export";
import type { SourceImageInfo } from "./image-processing";
import type { MosaicResult } from "./mosaic-engine";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
	isCoarseGrid,
} from "./tessera-sizing";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";

export type { MosaicResult };

/**
 * Settings for mosaic export.
 */
export interface ExportSettings {
	exportFormat: ExportFormat;
	exportQuality: number;
	exportAltText: string;
	exportBackgroundColor: string;
}

/**
 * Information about a tessera that has been processed for the mosaic.
 */
export interface TesseraInfo {
	file: File;
	fileName: string;
	isValid: boolean;
	error: string | null;
	isLowResolution: boolean;
	previewUrl: string | null;
	/** Whether the tessera is supplemented (generated) */
	isSupplemented?: boolean;
}

/**
 * Represents the current state of the mosaic creation workflow.
 */
export interface WorkflowState {
	currentStep: WorkflowStep;
	/** The furthest step the user has completed */
	furthestCompletedStep: WorkflowStep;
	sourceImage: SourceImageInfo | null;
	requestedTesseraSize: number | null;
	adjustedTesseraSize: number | null;
	isCoarseGrid: boolean;
	hasValidSourceDimensions: boolean;
	sourceImageError: string | null;
	/** Collection of uploaded or generated tesserae */
	tesserae: TesseraInfo[];
	validTesseraCount: number;
	rejectedTesseraCount: number;
	totalTesseraCount: number;
	isLowVarietyCollection: boolean;
	/** The recommended number of tesserae for good variety */
	varietyRecommendation: number | null;
	hasAcceptedSupplementation: boolean;
	/** Seed for generating reproducible noise tesserae */
	seed: number | null;
	generatedTesseraCount: number | null;
	needsRegeneration: boolean;
	/** The generated mosaic result, set after mosaic generation completes */
	mosaicResult: MosaicResult | null;
	exportAltText: string;
	exportFormat: ExportFormat;
	/** Quality setting for JPEG/WebP exports (0.0 - 1.0) */
	exportQuality: number;
	exportBackgroundColor: string;
}

/**
 * Workflow steps.
 */
export enum WorkflowStep {
	CHOOSE_SOURCE_IMAGE,
	BUILD_TESSERAE,
	GENERATE_AND_PREVIEW,
	EXPORT_MOSAIC,
}

/**
 * Maximum value for seed generation.
 */
export const SEED_MAX = 1_000_000;

/**
 * Initial workflow state.
 */
export const INITIAL_WORKFLOW_STATE: WorkflowState = {
	currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
	furthestCompletedStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
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
	seed: null,
	generatedTesseraCount: null,
	needsRegeneration: false,
	mosaicResult: null,
	exportAltText: "",
	exportFormat: "png",
	exportQuality: 0.9,
	exportBackgroundColor: "#ffffff",
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
 * Check whether the valid tessera count falls below the variety recommendation
 * (10% of grid cells, capped at 100).
 *
 * @returns `true` when {@link validTesseraCount} is less than the recommended
 *   minimum for the given {@link gridCellCount}.
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
				"The selected image is too small (both dimensions must be at least 8 pixels). Please select a different image.",
			currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
		};
	}

	return {
		...state,
		sourceImage,
		hasValidSourceDimensions: true,
		sourceImageError: null,
		currentStep: WorkflowStep.BUILD_TESSERAE,
		furthestCompletedStep: Math.max(
			state.furthestCompletedStep,
			WorkflowStep.BUILD_TESSERAE,
		),
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
		currentStep: WorkflowStep.BUILD_TESSERAE,
		furthestCompletedStep: Math.max(
			state.furthestCompletedStep,
			WorkflowStep.BUILD_TESSERAE,
		),
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
		currentStep: WorkflowStep.BUILD_TESSERAE,
		furthestCompletedStep: Math.max(
			state.furthestCompletedStep,
			WorkflowStep.BUILD_TESSERAE,
		),
	};
}

/**
 * Update workflow state by clearing all tesserae.
 * Resets the tesserae collection and all related metrics.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with empty tesserae collection
 */
export function updateWorkflowClearAllTesserae(
	state: WorkflowState,
): WorkflowState {
	const varietyMetrics = recalculateVarietyMetrics(state, 0);

	return {
		...state,
		tesserae: [],
		validTesseraCount: 0,
		rejectedTesseraCount: 0,
		totalTesseraCount: 0,
		isLowVarietyCollection: varietyMetrics.isLowVariety,
		varietyRecommendation: varietyMetrics.varietyRecommendation,
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
 * Generate supplemental tesserae to reach the variety recommendation.
 * Generates enough tesserae to bring the total valid count up to the recommendation.
 *
 * @param state - The current workflow state
 * @returns Promise resolving to an array of generated tesserae marked as supplemented
 */
export async function generateSupplementedTesserae(
	state: WorkflowState,
): Promise<TesseraInfo[]> {
	if (
		!state.sourceImage ||
		!state.adjustedTesseraSize ||
		!state.varietyRecommendation
	) {
		return [];
	}

	const neededCount = Math.max(
		0,
		state.varietyRecommendation - state.validTesseraCount,
	);

	if (neededCount <= 0) {
		return [];
	}

	const tempState = {
		...state,
		generatedTesseraCount: neededCount,
		seed: state.seed ?? Math.floor(Math.random() * SEED_MAX),
	};

	try {
		const tesserae = await generateNoiseTesseraeFromState(tempState);
		return tesserae.map((tessera) => ({
			...tessera,
			isSupplemented: true,
		}));
	} catch (error) {
		console.error("Error generating supplemented tesserae:", error);
		return [];
	}
}

/**
 * Filter out generated tesserae (those with isSupplemented flag) and append new tesserae.
 * Used when generating new tesserae to clear previous generated ones while keeping uploaded ones.
 *
 * @param state - The current workflow state
 * @param newTesserae - Tesserae to append to the existing collection
 * @returns State with filtered tesserae and updated variety metrics
 */
function filterGeneratedAndAppend(
	state: WorkflowState,
	newTesserae: TesseraInfo[],
): WorkflowState {
	// Keep only uploaded tesserae (those without isSupplemented flag)
	const uploadedTesserae = state.tesserae.filter(
		(tessera) => !tessera.isSupplemented,
	);
	const allTesserae = [...uploadedTesserae, ...newTesserae];
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
	};
}

/**
 * Append new tesserae to the collection and recalculate variety metrics.
 * Used when uploading new tesserae to preserve all existing ones.
 *
 * @param state - The current workflow state
 * @param newTesserae - Tesserae to append to the existing collection
 * @returns State with appended tesserae and updated variety metrics
 */
function appendTesseraeAndRecalculate(
	state: WorkflowState,
	newTesserae: TesseraInfo[],
): WorkflowState {
	const allTesserae = [...state.tesserae, ...newTesserae];
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
	};
}

/**
 * Update workflow with supplemented tesserae.
 * Appends the supplemented tesserae to the collection and marks supplementation as accepted.
 *
 * @param state - The current workflow state
 * @param supplementedTesserae - The tesserae to add to the collection
 * @returns Updated workflow state with supplemented tesserae and metrics recalculated
 */
export function updateWorkflowWithSupplementedTesserae(
	state: WorkflowState,
	supplementedTesserae: TesseraInfo[],
): WorkflowState {
	return {
		...appendTesseraeAndRecalculate(state, supplementedTesserae),
		hasAcceptedSupplementation: true,
	};
}

/**
 * Update workflow with a specific seed for noise tesserae generation.
 * Triggers regeneration of tesserae with the new seed.
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
		seed,
		needsRegeneration: true,
	};
}

/**
 * Update workflow with a new random seed for noise tesserae generation.
 * Generates a new random seed and triggers regeneration of tesserae.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with new random seed and regeneration flag set
 */
export function updateWorkflowWithNewSeed(state: WorkflowState): WorkflowState {
	const newSeed = Math.floor(Math.random() * SEED_MAX);
	return updateWorkflowWithSeed(state, newSeed);
}

/**
 * Update workflow with a specific count of tesserae to generate.
 * Triggers regeneration of tesserae with the updated count.
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
 * Clears existing generated tesserae, keeps uploaded tesserae, and appends the new generated tesserae.
 *
 * @param state - The current workflow state
 * @param tesserae - The newly generated tesserae collection
 * @returns Updated workflow state with filtered tesserae and regeneration flag cleared
 */
export function updateWorkflowWithGeneratedTesserae(
	state: WorkflowState,
	tesserae: TesseraInfo[],
): WorkflowState {
	return {
		...filterGeneratedAndAppend(state, tesserae),
		needsRegeneration: false,
	};
}

/**
 * Advance the workflow from tesserae review to the generate-and-preview
 * step.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state advanced to the generate-and-preview step
 */
export function updateWorkflowAdvanceFromReview(
	state: WorkflowState,
): WorkflowState {
	return {
		...state,
		currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
		furthestCompletedStep: Math.max(
			state.furthestCompletedStep,
			WorkflowStep.GENERATE_AND_PREVIEW,
		),
	};
}

/**
 * Update workflow state with a mosaic result.
 * Updates the workflow with the generated mosaic and advances to the export step.
 *
 * @param state - The current workflow state
 * @param mosaicResult - The generated mosaic result
 * @returns Updated workflow state with the mosaic result and export step
 */
export function updateWorkflowWithMosaicResult(
	state: WorkflowState,
	mosaicResult: MosaicResult,
): WorkflowState {
	return {
		...state,
		mosaicResult,
		currentStep: WorkflowStep.EXPORT_MOSAIC,
		furthestCompletedStep: Math.max(
			state.furthestCompletedStep,
			WorkflowStep.EXPORT_MOSAIC,
		),
	};
}

/**
 * Update workflow state with export settings.
 * Applies a partial update — only the fields present in {@link settings}
 * are changed; all other state fields remain untouched.
 *
 * @param state - The current workflow state
 * @param settings - The export settings to update (partial)
 * @returns Updated workflow state with the new export settings applied
 */
export function updateWorkflowExportSettings(
	state: WorkflowState,
	settings: Partial<ExportSettings>,
): WorkflowState {
	return {
		...state,
		...settings,
	};
}

/**
 * Update workflow state when replacing the source image.
 * Preserves uploaded tessera files but resets the requested/adjusted size,
 * seed, mosaic, and the generation flag, returning to tessera sizing.
 *
 * @param state - The current workflow state
 * @param sourceImage - The new source image information
 * @returns Updated workflow state with preserved uploads but reset derived state
 */
export function updateWorkflowOnSourceReplacement(
	state: WorkflowState,
	sourceImage: SourceImageInfo,
): WorkflowState {
	const hasValidDimensions = hasValidTesseraSizes(
		sourceImage.width,
		sourceImage.height,
	);

	return {
		...state,
		sourceImage,
		hasValidSourceDimensions: hasValidDimensions,
		sourceImageError: hasValidDimensions
			? null
			: "The selected image is too small (both dimensions must be at least 8 pixels). Please select a different image.",
		currentStep: hasValidDimensions
			? WorkflowStep.BUILD_TESSERAE
			: WorkflowStep.CHOOSE_SOURCE_IMAGE,
		requestedTesseraSize: null,
		adjustedTesseraSize: null,
		isCoarseGrid: false,
		seed: null,
		mosaicResult: null,
		needsRegeneration: false,
	};
}

/**
 * Update workflow state when tessera size changes.
 * Preserves uploads and seed, recalculates grid metrics, and discards the old mosaic.
 *
 * @param state - The current workflow state
 * @param requestedSize - The new requested tessera size
 * @returns Updated workflow state with recalculated metrics
 */
export function updateWorkflowOnTesseraSizeChange(
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
		mosaicResult: null,
	};
}

/**
 * Update workflow state on cancellation or failure.
 * Preserves source, tesserae, and settings and discards incomplete output.
 *
 * @param state - The current workflow state
 * @returns Updated workflow state with incomplete output discarded
 */
export function updateWorkflowOnCancellationOrFailure(
	state: WorkflowState,
): WorkflowState {
	return {
		...state,
		mosaicResult: null,
		needsRegeneration: false,
	};
}

/**
 * Update workflow state on regeneration.
 * Replaces the previous mosaic result rather than retaining a history.
 *
 * @param state - The current workflow state
 * @param mosaicResult - The new mosaic result
 * @returns Updated workflow state with new mosaic result
 */
export function updateWorkflowOnRegeneration(
	state: WorkflowState,
	mosaicResult: MosaicResult,
): WorkflowState {
	return {
		...state,
		mosaicResult,
	};
}
