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

/** Number of random components used to generate the noise pattern identifier. */
const NOISE_COMPONENT_COUNT = 10;

/**
 * Generate a deterministic noise pattern identifier as a data URL.
 *
 * Encodes pattern metadata (type, size, seed, random components) into a
 * synthetic data URL to ensure deterministic, reproducible results across
 * tesserae without requiring actual pixel data.
 *
 * @param size - The size of the tessera in pixels
 * @param seed - The seed for deterministic noise generation
 * @param isSmooth - Whether to generate smooth (blended) or sharp (pixel) noise
 * @returns A data URL encoding the noise pattern metadata
 */
function generateNoisePattern(
	size: number,
	seed: number,
	isSmooth: boolean,
): string {
	const style = isSmooth ? "smooth" : "sharp";
	const parts = [`${style}-noise-${size}x${size}-seed-${seed}`];

	for (let i = 0; i < NOISE_COMPONENT_COUNT; i++) {
		parts.push(`${Math.floor(seededRandom(seed + i) * 1000)}`);
	}

	return `data:image/png;base64,${btoa(parts.join("-"))}`;
}

/**
 * Generate noise-based tesserae for the mosaic.
 *
 * Each tessera contains a synthetic data URL encoding deterministic noise pattern
 * metadata rather than actual image data, ensuring reproducible results for a given seed.
 *
 * @param _sourceImage - The source image information (reserved for future use)
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
		const localSeed = seed + i;
		const isSmooth = seededRandom(localSeed) > 0.5;
		const previewUrl = generateNoisePattern(size, localSeed, isSmooth);
		const style = isSmooth ? "smooth" : "sharp";
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
