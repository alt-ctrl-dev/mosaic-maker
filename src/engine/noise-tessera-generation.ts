import { createCanvas } from "./export";
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

/** Large primes used to spread 2D pixel coordinates across the seed space. */
const X_HASH_PRIME = 73856093;
const Y_HASH_PRIME = 19349663;

/** Grid cell width in pixels used when interpolating smooth value noise. */
const SMOOTH_CELL_SIZE = 4;

/**
 * Minimum brightness for noise tint channels (0-255).
 * Keeps pixels from becoming so dark that the pattern is invisible.
 */
const TINT_MIN = 96;

/** Range above {@link TINT_MIN} for noise tint channels, yielding values in [96, 255]. */
const TINT_RANGE = 160;

/** RGB tint applied to noise, derived from the source image and seed. */
interface TintColor {
	r: number;
	g: number;
	b: number;
}

/**
 * Produce a deterministic noise value at a 2D pixel coordinate.
 *
 * @param x - The pixel x coordinate
 * @param y - The pixel y coordinate
 * @param seed - The seed for deterministic generation
 * @returns A noise value between 0 and 1
 */
function noiseAt(x: number, y: number, seed: number): number {
	return seededRandom(seed + x * X_HASH_PRIME + y * Y_HASH_PRIME);
}

/**
 * Produce a smoothed noise value by bilinearly interpolating a coarse grid of
 * random values, yielding gradual transitions instead of per-pixel static.
 *
 * @param x - The pixel x coordinate
 * @param y - The pixel y coordinate
 * @param seed - The seed for deterministic generation
 * @returns A smoothed noise value between 0 and 1
 */
function smoothNoiseAt(x: number, y: number, seed: number): number {
	const gx = x / SMOOTH_CELL_SIZE;
	const gy = y / SMOOTH_CELL_SIZE;
	const x0 = Math.floor(gx);
	const y0 = Math.floor(gy);
	const tx = gx - x0;
	const ty = gy - y0;

	const v00 = noiseAt(x0, y0, seed);
	const v10 = noiseAt(x0 + 1, y0, seed);
	const v01 = noiseAt(x0, y0 + 1, seed);
	const v11 = noiseAt(x0 + 1, y0 + 1, seed);

	const top = v00 + (v10 - v00) * tx;
	const bottom = v01 + (v11 - v01) * tx;
	return top + (bottom - top) * ty;
}

/**
 * Derive a base tint color from the source image characteristics.
 *
 * The {@link SourceImageInfo} carries no pixel data, so the tint is sampled
 * deterministically from the image's dimensions and orientation combined with
 * the seed. This keeps each generated tessera visually tied to its source while
 * remaining reproducible.
 *
 * @param sourceImage - The source image the tesserae are generated for
 * @param seed - The seed for deterministic generation
 * @returns A tint color with channels in the 0-255 range
 */
function sourceTintColor(
	sourceImage: SourceImageInfo,
	seed: number,
): TintColor {
	const base =
		sourceImage.width * 31 + sourceImage.height * 17 + sourceImage.orientation;
	return {
		r: TINT_MIN + Math.floor(seededRandom(base + seed) * TINT_RANGE),
		g: TINT_MIN + Math.floor(seededRandom(base + seed + 1) * TINT_RANGE),
		b: TINT_MIN + Math.floor(seededRandom(base + seed + 2) * TINT_RANGE),
	};
}

/**
 * Render a noise pattern to a canvas and export it as a PNG data URL.
 *
 * Sharp noise uses independent per-pixel values; smooth noise bilinearly
 * interpolates a coarser grid for softer transitions. Both are tinted with a
 * color sampled deterministically from the source image.
 *
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 * @throws Error if the canvas 2D context is unavailable
 */
function generateNoisePattern(
	sourceImage: SourceImageInfo,
	size: number,
	seed: number,
	isSmooth: boolean,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): string {
	const canvas = canvasCreator(size, size);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context for noise generation");
	}

	const tint = sourceTintColor(sourceImage, seed);
	const imageData = ctx.createImageData(size, size);
	const { data } = imageData;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const offset = (y * size + x) * 4;
			const noise = isSmooth ? smoothNoiseAt(x, y, seed) : noiseAt(x, y, seed);

			data[offset] = Math.round(tint.r * noise);
			data[offset + 1] = Math.round(tint.g * noise);
			data[offset + 2] = Math.round(tint.b * noise);
			data[offset + 3] = 255;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas.toDataURL("image/png");
}

/**
 * Generate noise-based tesserae for the mosaic.
 *
 * Each tessera is a real PNG rendered on a canvas with seeded noise pixels
 * tinted with a color sampled from the source image. Generation is
 * deterministic — the same seed and source image always yield identical
 * tesserae.
 *
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 */
export async function generateTesseraeUsingNoise(
	sourceImage: SourceImageInfo,
	count: number,
	size: number,
	seed: number,
	canvasCreator: (
		width: number,
		height: number,
	) => HTMLCanvasElement = createCanvas,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		const localSeed = seed + i;
		const isSmooth = seededRandom(localSeed) > 0.5;
		const previewUrl = generateNoisePattern(
			sourceImage,
			size,
			localSeed,
			isSmooth,
			canvasCreator,
		);
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
