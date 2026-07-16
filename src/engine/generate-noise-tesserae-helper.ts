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
	// Validate that we have the required information
	if (!state.sourceImage || !state.adjustedTesseraSize) {
		throw new Error("Source image and adjusted tessera size are required");
	}

	// Calculate grid cell count
	const gridCellCount = calculateGridCellCount(
		state.adjustedTesseraSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	// Determine the number of tesserae to generate
	let tesseraCount: number;
	if (state.generatedTesseraCount !== null) {
		// Use the explicitly set count
		tesseraCount = state.generatedTesseraCount;
	} else {
		// Use the recommended count
		tesseraCount = calculateRecommendedTesseraCount(gridCellCount);
	}

	// Validate count is within bounds (1 to grid cell count)
	const maxCount = gridCellCount;
	tesseraCount = Math.max(1, Math.min(tesseraCount, maxCount));

	// Get the seed, generate one if not available
	const seed = state.seed ?? Math.floor(Math.random() * 1000000);

	// Generate the tesserae
	return generateNoiseTesserae(
		state.sourceImage,
		tesseraCount,
		state.adjustedTesseraSize,
		seed,
	);
}
