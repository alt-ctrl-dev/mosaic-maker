import { createCanvas, loadImage } from "./export";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";
import { SEED_MAX } from "./workflow-state";

/** Counter to ensure unique IDs for generated tesserae */
let tesseraIdCounter = 0;

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
 * How far noise may brighten or darken the palette tint, as a fraction.
 * Keeps a generated tessera recognisably its palette color while still
 * looking textured.
 */
const NOISE_CONTRAST = 0.5;

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

/** Width and height of the downsampled palette read from the source image. */
const PALETTE_SIZE = 16;

/**
 * Read a palette of colors from the source image by downsampling it.
 * Generated tesserae are tinted with these colors so the collection
 * reproduces the source image's palette.
 *
 * @param sourceImage - The source image to sample
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 * @param imageLoader - Image loading function (overridable for testing)
 * @returns A non-empty list of colors sampled from the source image
 */
async function readSourcePalette(
	sourceImage: SourceImageInfo,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
	imageLoader: (url: string) => Promise<HTMLImageElement>,
): Promise<TintColor[]> {
	const canvas = canvasCreator(PALETTE_SIZE, PALETTE_SIZE);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context for palette sampling");
	}

	const img = await imageLoader(sourceImage.url);
	ctx.drawImage(img, 0, 0, PALETTE_SIZE, PALETTE_SIZE);

	const { data } = ctx.getImageData(0, 0, PALETTE_SIZE, PALETTE_SIZE);
	const palette: TintColor[] = [];
	for (let offset = 0; offset < data.length; offset += 4) {
		palette.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] });
	}

	return palette.length > 0 ? palette : [{ r: 128, g: 128, b: 128 }];
}

/**
 * Pick a palette color deterministically for a given seed.
 */
function sourceTintColor(palette: TintColor[], seed: number): TintColor {
	return palette[
		Math.floor(seededRandom(seed) * palette.length) % palette.length
	];
}

/**
 * Render a noise pattern to a canvas and export it as a PNG data URL.
 *
 * Sharp noise uses independent per-pixel values; smooth noise bilinearly
 * interpolates a coarser grid for softer transitions. Both are tinted with a
 * color sampled deterministically from the source image.
 *
 * @param palette - Colors sampled from the source image
 * @param size - Width and height of the noise pattern in pixels
 * @param seed - Deterministic seed for noise generation
 * @param isSmooth - Whether to use smooth (interpolated) or sharp (per-pixel) noise
 * @param canvasCreator - Factory for creating canvas elements (overridable for testing)
 * @returns A PNG data URL for the rendered noise pattern
 * @throws Error if the canvas 2D context is unavailable
 */
function generateNoisePattern(
	palette: TintColor[],
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

	const tint = sourceTintColor(palette, seed);
	const imageData = ctx.createImageData(size, size);
	const { data } = imageData;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const offset = (y * size + x) * 4;
			const noise = isSmooth ? smoothNoiseAt(x, y, seed) : noiseAt(x, y, seed);
			// Map noise from [0, 1] onto a brightness factor centred on 1.
			const brightness = 1 + (noise - 0.5) * NOISE_CONTRAST * 2;

			data[offset] = Math.round(tint.r * brightness);
			data[offset + 1] = Math.round(tint.g * brightness);
			data[offset + 2] = Math.round(tint.b * brightness);
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
	imageLoader: (url: string) => Promise<HTMLImageElement> = loadImage,
): Promise<TesseraInfo[]> {
	const palette = await readSourcePalette(
		sourceImage,
		canvasCreator,
		imageLoader,
	);
	const tesserae: TesseraInfo[] = [];

	for (let i = 0; i < count; i++) {
		const localSeed = seed + i;
		const isSmooth = seededRandom(localSeed) > 0.5;
		const previewUrl = generateNoisePattern(
			palette,
			size,
			localSeed,
			isSmooth,
			canvasCreator,
		);
		const style = isSmooth ? "smooth" : "sharp";
		const uniqueId = tesseraIdCounter++;
		const fileName = `generated-${i}-${style}-${seed}-${uniqueId}.png`;

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
