import { runDeviceCapacityPreflight } from "./device-capacity-preflight";
import { createCanvas, loadImage } from "./export";
import type { SourceImageInfo } from "./image-processing";
import {
	calculateRecommendedTesseraCount,
	generateTesseraeUsingNoise,
} from "./noise-tessera-generation";
import { calculateGridCellCount } from "./tessera-sizing";
import type { TesseraInfo } from "./workflow-state";
import { SEED_MAX } from "./workflow-state";

/** Inputs for procedural noise tessera generation. */
export interface NoiseTesseraeParams {
	sourceImage: SourceImageInfo | null;
	adjustedTesseraSize: number | null;
	/** Explicit count to generate; falls back to the recommended count. */
	generatedTesseraCount?: number | null;
	/** Seed for reproducible output; random when absent. */
	seed?: number | null;
}

/**
 * Generate noise tesserae for the given source image and tessera size.
 * Calculates the appropriate number of tesserae and uses the given seed or
 * generates a new one if none exists.
 *
 * @param params - Source image, tessera size, and generation parameters
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 * @param imageLoader - Image loading function (overridable for testing)
 * @returns Promise resolving to an array of generated tesserae
 * @throws Error if source image or adjusted tessera size are missing
 */
export async function generateNoiseTesseraeFromState(
	params: NoiseTesseraeParams,
	canvasCreator: (
		width: number,
		height: number,
	) => HTMLCanvasElement = createCanvas,
	imageLoader: (url: string) => Promise<HTMLImageElement> = loadImage,
): Promise<TesseraInfo[]> {
	if (!params.sourceImage || !params.adjustedTesseraSize) {
		throw new Error("Source image and adjusted tessera size are required");
	}

	const gridCellCount = calculateGridCellCount(
		params.adjustedTesseraSize,
		params.sourceImage.width,
		params.sourceImage.height,
	);

	let tesseraCount: number;
	if (params.generatedTesseraCount != null) {
		tesseraCount = params.generatedTesseraCount;
	} else {
		tesseraCount = calculateRecommendedTesseraCount(gridCellCount);
	}

	// Run device capacity preflight to constrain tessera count
	const preflightResult = runDeviceCapacityPreflight(
		gridCellCount,
		tesseraCount,
		params.sourceImage.width,
		params.sourceImage.height,
	);

	if (!preflightResult.isSafe) {
		throw new Error(
			`Device capacity exceeded: ${preflightResult.reason}. ${preflightResult.remedy}`,
		);
	}

	tesseraCount = Math.max(1, Math.min(tesseraCount, gridCellCount));

	const seed = params.seed ?? Math.floor(Math.random() * SEED_MAX);

	return generateTesseraeUsingNoise(
		params.sourceImage,
		tesseraCount,
		params.adjustedTesseraSize,
		seed,
		canvasCreator,
		imageLoader,
	);
}
