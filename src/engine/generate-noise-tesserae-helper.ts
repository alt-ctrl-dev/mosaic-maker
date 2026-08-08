import { createCanvas, loadImage } from "./export";
import {
	calculateRecommendedTesseraCount,
	generateTesseraeUsingNoise,
} from "./noise-tessera-generation";
import { calculateGridCellCount } from "./tessera-sizing";
import { runDeviceCapacityPreflight } from "./device-capacity-preflight";
import type { TesseraInfo, WorkflowState } from "./workflow-state";
import { SEED_MAX } from "./workflow-state";

/**
 * Generate noise tesserae based on the current workflow state.
 * This function calculates the appropriate number of tesserae to generate and uses
 * the workflow state's seed or generates a new one if none exists.
 *
 * @param state - Current workflow state containing source image, tessera size, and generation parameters
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 * @param imageLoader - Image loading function (overridable for testing)
 * @returns Promise resolving to an array of generated tesserae
 * @throws Error if source image or adjusted tessera size are not available in the state
 */
export async function generateNoiseTesseraeFromState(
	state: WorkflowState,
	canvasCreator: (
		width: number,
		height: number,
	) => HTMLCanvasElement = createCanvas,
	imageLoader: (url: string) => Promise<HTMLImageElement> = loadImage,
): Promise<TesseraInfo[]> {
	if (!state.sourceImage || !state.adjustedTesseraSize) {
		throw new Error("Source image and adjusted tessera size are required");
	}

	const gridCellCount = calculateGridCellCount(
		state.adjustedTesseraSize,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	let tesseraCount: number;
	if (state.generatedTesseraCount !== null) {
		tesseraCount = state.generatedTesseraCount;
	} else {
		tesseraCount = calculateRecommendedTesseraCount(gridCellCount);
	}

	// Run device capacity preflight to constrain tessera count
	const preflightResult = runDeviceCapacityPreflight(
		gridCellCount,
		tesseraCount,
		state.sourceImage.width,
		state.sourceImage.height,
	);

	if (!preflightResult.isSafe) {
		throw new Error(
			`Device capacity exceeded: ${preflightResult.reason}. ${preflightResult.remedy}`,
		);
	}

	tesseraCount = Math.max(1, Math.min(tesseraCount, gridCellCount));

	const seed = state.seed ?? Math.floor(Math.random() * SEED_MAX);

	return generateTesseraeUsingNoise(
		state.sourceImage,
		tesseraCount,
		state.adjustedTesseraSize,
		seed,
		canvasCreator,
		imageLoader,
	);
}
