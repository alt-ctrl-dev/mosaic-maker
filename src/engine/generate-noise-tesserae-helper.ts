import type { TesseraInfo, WorkflowState } from "./workflow-state";
import {
	generateNoiseTesserae,
	calculateRecommendedTesseraCount,
} from "./noise-tessera-generation";
import { calculateGridCellCount } from "./tessera-sizing";

/**
 * Generate noise tesserae based on the current workflow state.
 * This function calculates the appropriate number of tesserae to generate and uses
 * the workflow state's seed or generates a new one if none exists.
 *
 * @param state - Current workflow state containing source image, tessera size, and generation parameters
 * @returns Promise resolving to an array of generated tesserae
 * @throws Error if source image or adjusted tessera size are not available in the state
 */
export async function generateNoiseTesseraeFromState(
	state: WorkflowState,
): Promise<TesseraInfo[]> {
	if (!state.sourceImage || !state.adjustedTesseraSize) {
		throw new Error("Source image and adjusted tessera size are required");
	}

	const gridCellCount = calculateGridCellCount(
		state.adjustedTesseraSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	const requestedCount =
		state.generatedTesseraCount ??
		calculateRecommendedTesseraCount(gridCellCount);
	const tesseraCount = Math.max(1, Math.min(requestedCount, gridCellCount));

	const seed = state.seed ?? Math.floor(Math.random() * 1000000);

	return generateNoiseTesserae(
		state.sourceImage,
		tesseraCount,
		state.adjustedTesseraSize,
		seed,
	);
}
