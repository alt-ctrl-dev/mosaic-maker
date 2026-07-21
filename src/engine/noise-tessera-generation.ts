import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

/**
 * Simple seeded random number generator using a hash-based approach.
 * This function generates deterministic random numbers based on the provided seed.
 *
 * @param seed - The seed value used to generate the random number
 * @returns A deterministic random number between 0 and 1
 */
function seededRandom(seed: number): number {
	seed = Math.abs(seed);
	seed = ((seed >> 16) ^ seed) * 0x45d9f3b;
	seed = ((seed >> 16) ^ seed) * 0x45d9f3b;
	seed = (seed >> 16) ^ seed;
	return seed / 0x7fffffff;
}

/**
 * Calculate the recommended number of tesserae to generate based on grid cell count.
 * The recommendation is 10% of the total grid cells, with a minimum of 1 and a maximum of 100.
 *
 * @param gridCellCount - The total number of cells in the mosaic grid
 * @returns The recommended number of tesserae to generate
 */
export function calculateRecommendedTesseraCount(
	gridCellCount: number,
): number {
	const recommended = Math.max(1, Math.floor(gridCellCount * 0.1));
	return Math.min(recommended, 100);
}

/**
 * Generate noise-based tesserae for the mosaic.
 * Creates deterministic noise patterns based on the provided seed for reproducible results.
 *
 * @param _sourceImage - The source image information (unused in current implementation)
 * @param count - The number of tesserae to generate
 * @param _size - The size of each tessera in pixels (unused in current implementation)
 * @param seed - The seed value for deterministic noise generation
 * @returns Promise resolving to an array of generated tesserae
 */
export async function generateNoiseTesserae(
	_sourceImage: SourceImageInfo,
	count: number,
	_size: number,
	seed: number,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		const randomValue = seededRandom(seed + i);
		const style = randomValue > 0.5 ? "smooth" : "sharp";
		const id = `generated-${i}-${style}-${seed}`;

		tesserae.push({
			file: new File([id], `${id}.png`, { type: "image/png" }),
			fileName: `${id}.png`,
			isValid: true,
			error: null,
			isLowResolution: false,
			previewUrl: `data:image/png;base64,${btoa(id)}`,
		});
	}

	return tesserae;
}
