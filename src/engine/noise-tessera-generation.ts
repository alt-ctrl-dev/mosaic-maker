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
 * Generate a deterministic noise pattern as a data URL.
 * This creates a mock data URL that represents either smooth or sharp noise.
 *
 * @param size - The size of the tessera in pixels
 * @param seed - The seed for deterministic noise generation
 * @param isSmooth - Whether to generate smooth (blended) or sharp (pixel) noise
 * @returns A data URL representing the noise pattern
 */
function generateNoisePattern(
	size: number,
	seed: number,
	isSmooth: boolean,
): string {
	// Create a deterministic base64 string based on parameters
	// In a real implementation, this would be an actual canvas-generated image
	const prefix = isSmooth ? "smooth" : "sharp";
	const content = `${prefix}-noise-${size}x${size}-seed-${seed}`;

	// Create a longer, more realistic-looking base64 string
	let result = content;
	for (let i = 0; i < 10; i++) {
		result += `-${Math.floor(seededRandom(seed + i) * 1000)}`;
	}

	return `data:image/png;base64,${btoa(result)}`;
}

/**
 * Generate noise-based tesserae for the mosaic.
 * Creates deterministic noise patterns based on the provided seed for reproducible results.
 *
 * @param _sourceImage - The source image information (used for dimensions and color sampling simulation)
 * @param count - The number of tesserae to generate
 * @param size - The size of each tessera in pixels
 * @param seed - The seed value for deterministic noise generation
 * @returns Promise resolving to an array of generated tesserae
 */
export async function generateTesseraeUsingNoise(
	_sourceImage: SourceImageInfo,
	count: number,
	size: number,
	seed: number,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		// Determine if this tessera should be smooth or sharp
		const isSmooth = seededRandom(seed + i) > 0.5;
		const style = isSmooth ? "smooth" : "sharp";

		// Generate the noise pattern as a data URL
		const previewUrl = generateNoisePattern(size, seed + i, isSmooth);

		// Create file content
		const fileName = `generated-${i}-${style}-${seed}.png`;

		tesserae.push({
			file: new File([previewUrl], fileName, { type: "image/png" }),
			fileName,
			isValid: true,
			error: null,
			isLowResolution: false,
			previewUrl,
		});
	}

	return tesserae;
}
