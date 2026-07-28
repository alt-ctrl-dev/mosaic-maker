import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";
import { SEED_MAX } from "./workflow-state";

/**
 * Simple seeded random number generator using a hash-based approach.
 *
 * @param seed - The seed value used to generate the random number
 * @returns A deterministic random number between 0 and 1
 */
function seededRandom(seed: number): number {
	let s = Math.abs(seed) % SEED_MAX;
	s = ((s >> 16) ^ s) * 0x45d9f3b;
	s = ((s >> 16) ^ s) * 0x45d9f3b;
	s = (s >> 16) ^ s;
	return s / 0x7fffffff;
}

/**
 * Calculate the recommended number of tesserae for the given grid cell count.
 * Returns 10% of grid cells, capped at 100, with a minimum of 1.
 *
 * @param gridCellCount - The total number of grid cells in the mosaic
 * @returns The recommended tessera count
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
export async function generateTesseraeUsingNoise(
	_sourceImage: SourceImageInfo,
	count: number,
	_size: number,
	seed: number,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		const isSmooth = seededRandom(seed + i) > 0.5;
		const style = isSmooth ? "smooth" : "sharp";
		const content = `generated-${i}-${style}-${seed}`;
		const fileName = `${content}.png`;

		tesserae.push({
			file: new File([content], fileName, { type: "image/png" }),
			fileName,
			isValid: true,
			error: null,
			isLowResolution: false,
			previewUrl: `data:image/png;base64,${btoa(content)}`,
		});
	}

	return tesserae;
}
