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
	sourceImage: SourceImageInfo | null;
	requestedTesseraSize: number | null;
	adjustedTesseraSize: number | null;
	isCoarseGrid: boolean;
	hasValidSourceDimensions: boolean;
	sourceImageError: string | null;
	tesserae: TesseraInfo[];
	validTesseraCount: number;
	rejectedTesseraCount: number;
	totalTesseraCount: number;
	/** Whether the collection has low variety */
	isLowVarietyCollection: boolean;
	/** The recommended number of tesserae for good variety */
	varietyRecommendation: number | null;
	/** Whether the user has accepted supplementation */
	hasAcceptedSupplementation: boolean;
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
