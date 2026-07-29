import { createCanvas } from "./export";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

/**
 * Result of a mosaic generation operation.
 *
 * The {@link progress} field is optionally populated during async generation
 * to report incremental status to the caller.
 */
export interface MosaicResult {
	/** The mosaic image as a PNG data URL */
	dataUrl: string;
	/** Width of the mosaic in pixels */
	width: number;
	/** Height of the mosaic in pixels */
	height: number;
	/** Incremental generation progress, set when available */
	progress?: {
		percent: number;
		message: string;
	};
}

/**
 * OKLab color space representation
 */
interface Oklab {
	L: number;
	a: number;
	b: number;
}

/**
 * 3x3 spatial color grid for matching
 */
interface ColorGrid {
	colors: Oklab[][];
}

/**
 * Tessera with precomputed color grid for matching
 */
interface ProcessedTessera {
	info: TesseraInfo;
	colorGrid: ColorGrid;
}

interface RGB {
	r: number;
	g: number;
	b: number;
}

/** Width and height of the spatial color grid used for matching. */
const COLOR_GRID_SIZE = 3;

/** Alpha blending ratio for tessera layer in the composite mosaic. */
const BLEND_TESSERA_ALPHA = 0.75;

/** Alpha blending ratio for source image layer in the composite mosaic. */
const BLEND_SOURCE_ALPHA = 0.25;

/** Tolerance multiplier for neighbor-avoidance: an alternative within this factor of the best match is preferred. */
const ALTERNATIVE_TOLERANCE = 1.1;

/** Penalty multiplier applied when a tessera repeats and no acceptable alternative exists. */
const REPETITION_PENALTY = 1.5;

/**
 * Generate a mosaic from a source image and a collection of tesserae.
 * Invalid tesserae are filtered out. When no valid tesserae remain,
 * a placeholder mosaic is returned.
 *
 * @param sourceImage - Information about the source image
 * @param tesserae - Array of tesserae to use in the mosaic
 * @param tesseraSize - The size of each tessera in pixels
 * @param canvasCreator - Optional factory for creating canvas elements (for testing)
 * @returns A promise that resolves to the generated mosaic result
 * @throws Error if tessera size is not positive or source dimensions are not positive
 */
export async function generateMosaic(
	sourceImage: SourceImageInfo,
	tesserae: TesseraInfo[],
	tesseraSize: number,
	canvasCreator: (
		width: number,
		height: number,
	) => HTMLCanvasElement = createCanvas,
): Promise<MosaicResult> {
	if (tesseraSize <= 0) {
		throw new Error("Tessera size must be positive");
	}

	if (sourceImage.width <= 0 || sourceImage.height <= 0) {
		throw new Error("Source image dimensions must be positive");
	}

	const validTesserae = tesserae.filter((t) => t.isValid);

	if (validTesserae.length === 0) {
		return {
			dataUrl: generatePlaceholderMosaic(
				sourceImage.width,
				sourceImage.height,
				canvasCreator,
			),
			width: sourceImage.width,
			height: sourceImage.height,
		};
	}

	const sourceCanvas = await createCanvasFromSource(sourceImage, canvasCreator);

	const processedTesserae = await Promise.all(
		validTesserae.map(async (tessera) => ({
			info: tessera,
			colorGrid: await extractColorGrid(
				tessera.previewUrl,
				tesseraSize,
				canvasCreator,
			),
		})),
	);

	const resultCanvas = await generateMosaicCanvas(
		sourceCanvas,
		processedTesserae,
		tesseraSize,
		canvasCreator,
	);

	return {
		dataUrl: resultCanvas.toDataURL("image/png"),
		width: sourceImage.width,
		height: sourceImage.height,
	};
}

/**
 * Generate a placeholder mosaic for cases where no valid tesserae exist.
 * Creates a simple pattern on a light gray background.
 *
 * @param width - Width of the mosaic
 * @param height - Height of the mosaic
 * @param canvasCreator - Optional factory for creating canvas elements (for testing)
 * @returns Data URL of a placeholder image
 */
function generatePlaceholderMosaic(
	width: number,
	height: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): string {
	const canvas = canvasCreator(width, height);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return "data:image/png;base64,placeholder-error-canvas-context-unavailable";
	}

	ctx.fillStyle = "#f0f0f0";
	ctx.fillRect(0, 0, width, height);

	ctx.fillStyle = "#cccccc";
	for (let y = 0; y < height; y += 20) {
		const rowOffset = (y / 20) % 2 === 0 ? 0 : 10;
		for (let x = rowOffset; x < width; x += 20) {
			ctx.fillRect(x, y, 10, 10);
		}
	}

	return canvas.toDataURL("image/png");
}

/**
 * Create a canvas filled with a gradient that stands in for the source image
 * until actual source-image loading is implemented.
 */
async function createCanvasFromSource(
	sourceImage: SourceImageInfo,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
	const canvas = canvasCreator(sourceImage.width, sourceImage.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return canvas;
	}

	const gradient = ctx.createLinearGradient(
		0,
		0,
		sourceImage.width,
		sourceImage.height,
	);
	gradient.addColorStop(0, "red");
	gradient.addColorStop(0.5, "green");
	gradient.addColorStop(1, "blue");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, sourceImage.width, sourceImage.height);

	return canvas;
}

/**
 * Produce a {@link COLOR_GRID_SIZE}&times;{@link COLOR_GRID_SIZE} color grid
 * for a tessera. Currently generates a synthetic grid rather than extracting
 * colors from the preview image.
 */
async function extractColorGrid(
	previewUrl: string | null,
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<ColorGrid> {
	if (!previewUrl) {
		throw new Error("Preview URL is null");
	}

	const canvas = canvasCreator(tesseraSize, tesseraSize);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	// In a real implementation we would load the image from previewUrl;
	// for now we fill a solid color so matching produces consistent results.
	ctx.fillStyle = "red";
	ctx.fillRect(0, 0, tesseraSize, tesseraSize);

	const colors: Oklab[][] = [];

	for (let rowIndex = 0; rowIndex < COLOR_GRID_SIZE; rowIndex++) {
		const row: Oklab[] = [];
		for (let colIndex = 0; colIndex < COLOR_GRID_SIZE; colIndex++) {
			const rgb: RGB = {
				r: (colIndex / (COLOR_GRID_SIZE - 1)) * 255,
				g: (rowIndex / (COLOR_GRID_SIZE - 1)) * 255,
				b: 128,
			};
			row.push(rgbToOklab(rgb));
		}
		colors.push(row);
	}

	return { colors };
}

/**
 * Convert an sRGB color to the perceptually uniform OKLab color space.
 */
function rgbToOklab(rgb: RGB): Oklab {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	const rLin = linearize(r);
	const gLin = linearize(g);
	const bLin = linearize(b);

	const l = 0.412221 * rLin + 0.536333 * gLin + 0.051445 * bLin;
	const m = 0.211903 * rLin + 0.692639 * gLin + 0.095458 * bLin;
	const s = 0.088302 * rLin + 0.251733 * gLin + 0.659965 * bLin;

	const lCbrt = Math.cbrt(l);
	const mCbrt = Math.cbrt(m);
	const sCbrt = Math.cbrt(s);

	return {
		L: 0.210454 * lCbrt + 0.793721 * mCbrt - 0.004175 * sCbrt,
		a: 1.977998 * lCbrt - 2.428592 * mCbrt + 0.450594 * sCbrt,
		b: 0.025904 * lCbrt + 0.782772 * mCbrt - 0.808676 * sCbrt,
	};
}

/**
 * Apply sRGB gamma linearization.
 */
function linearize(channel: number): number {
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

/**
 * Calculate the Euclidean distance between two OKLab colors.
 * OKLab is perceptually uniform, so Euclidean distance approximates perceptual difference.
 */
function oklabDistance(a: Oklab, b: Oklab): number {
	const deltaL = a.L - b.L;
	const deltaA = a.a - b.a;
	const deltaB = a.b - b.b;

	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Calculate the average perceptual distance between two color grids.
 */
function averageGridDistance(grid1: ColorGrid, grid2: ColorGrid): number {
	if (
		grid1.colors.length !== grid2.colors.length ||
		grid1.colors[0].length !== grid2.colors[0].length
	) {
		throw new Error("Grids must have the same dimensions");
	}

	let totalDistance = 0;
	let count = 0;

	for (let rowIndex = 0; rowIndex < grid1.colors.length; rowIndex++) {
		for (let colIndex = 0; colIndex < grid1.colors[0].length; colIndex++) {
			totalDistance += oklabDistance(
				grid1.colors[rowIndex][colIndex],
				grid2.colors[rowIndex][colIndex],
			);
			count++;
		}
	}

	return totalDistance / count;
}

/**
 * Calculate the distance between a cell and a tessera, adjusted by neighbor-avoidance rules.
 * When a tessera repeats horizontally or vertically, alternatives within
 * {@link ALTERNATIVE_TOLERANCE} are preferred; when no alternative exists,
 * the distance is multiplied by {@link REPETITION_PENALTY}.
 */
function distanceWithNeighborAvoidance(
	cellGrid: ColorGrid,
	tesseraIndex: number,
	processedTesserae: ProcessedTessera[],
	neighborAbove: number | null,
	neighborLeft: number | null,
): number {
	const distance = averageGridDistance(
		cellGrid,
		processedTesserae[tesseraIndex].colorGrid,
	);

	const isNeighborRepeat =
		tesseraIndex === neighborAbove || tesseraIndex === neighborLeft;

	if (!isNeighborRepeat) {
		return distance;
	}

	let bestAlternativeDistance = Infinity;
	let hasAlternative = false;

	for (let j = 0; j < processedTesserae.length; j++) {
		if (j === neighborAbove || j === neighborLeft) {
			continue;
		}
		const altDistance = averageGridDistance(
			cellGrid,
			processedTesserae[j].colorGrid,
		);
		if (altDistance < bestAlternativeDistance) {
			bestAlternativeDistance = altDistance;
			hasAlternative = true;
		}
	}

	if (
		hasAlternative &&
		bestAlternativeDistance <= distance * ALTERNATIVE_TOLERANCE
	) {
		return bestAlternativeDistance;
	}

	if (!hasAlternative) {
		return distance * REPETITION_PENALTY;
	}

	return distance;
}

/**
 * Fill the result canvas by matching each source-grid cell to the best tessera,
 * blending 75% tessera with 25% source image, and avoiding visible repetition
 * on horizontal and vertical neighbors.
 */
async function generateMosaicCanvas(
	sourceCanvas: HTMLCanvasElement,
	processedTesserae: ProcessedTessera[],
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
	const resultCanvas = canvasCreator(sourceCanvas.width, sourceCanvas.height);
	const resultCtx = resultCanvas.getContext("2d");
	if (!resultCtx) {
		throw new Error("Failed to get result canvas context");
	}

	const gridRows = Math.ceil(sourceCanvas.height / tesseraSize);
	const gridCols = Math.ceil(sourceCanvas.width / tesseraSize);
	const tesseraGrid: (number | null)[][] = [];
	for (let row = 0; row < gridRows; row++) {
		tesseraGrid[row] = new Array(gridCols).fill(null);
	}

	for (let y = 0; y < sourceCanvas.height; y += tesseraSize) {
		for (let x = 0; x < sourceCanvas.width; x += tesseraSize) {
			const gridY = Math.floor(y / tesseraSize);
			const gridX = Math.floor(x / tesseraSize);

			const cellGrid = await extractSourceCellGrid(
				sourceCanvas,
				x,
				y,
				tesseraSize,
				canvasCreator,
			);

			const neighborAbove = gridY > 0 ? tesseraGrid[gridY - 1][gridX] : null;
			const neighborLeft = gridX > 0 ? tesseraGrid[gridY][gridX - 1] : null;

			let bestMatchIndex = 0;
			let bestDistance = Infinity;

			for (let i = 0; i < processedTesserae.length; i++) {
				const adjustedDistance = distanceWithNeighborAvoidance(
					cellGrid,
					i,
					processedTesserae,
					neighborAbove,
					neighborLeft,
				);

				if (adjustedDistance < bestDistance) {
					bestDistance = adjustedDistance;
					bestMatchIndex = i;
				}
			}

			tesseraGrid[gridY][gridX] = bestMatchIndex;

			const tesseraCanvas = await createTesseraImage(
				processedTesserae[bestMatchIndex].info,
				tesseraSize,
				canvasCreator,
			);

			resultCtx.globalAlpha = BLEND_TESSERA_ALPHA;
			resultCtx.drawImage(tesseraCanvas, x, y);

			resultCtx.globalAlpha = BLEND_SOURCE_ALPHA;
			resultCtx.drawImage(
				sourceCanvas,
				x,
				y,
				tesseraSize,
				tesseraSize,
				x,
				y,
				tesseraSize,
				tesseraSize,
			);

			resultCtx.globalAlpha = 1.0;
		}
	}

	return resultCanvas;
}

/**
 * Downsample a rectangular region of the source canvas to a
 * {@link COLOR_GRID_SIZE}&times;{@link COLOR_GRID_SIZE} color grid.
 */
async function extractSourceCellGrid(
	sourceCanvas: HTMLCanvasElement,
	offsetX: number,
	offsetY: number,
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<ColorGrid> {
	const tempCanvas = canvasCreator(COLOR_GRID_SIZE, COLOR_GRID_SIZE);
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) {
		throw new Error("Failed to get temporary canvas context");
	}

	tempCtx.drawImage(
		sourceCanvas,
		offsetX,
		offsetY,
		tesseraSize,
		tesseraSize,
		0,
		0,
		COLOR_GRID_SIZE,
		COLOR_GRID_SIZE,
	);

	const imageData = tempCtx.getImageData(
		0,
		0,
		COLOR_GRID_SIZE,
		COLOR_GRID_SIZE,
	);
	const colors: Oklab[][] = [];

	for (let rowIndex = 0; rowIndex < COLOR_GRID_SIZE; rowIndex++) {
		const row: Oklab[] = [];
		for (let colIndex = 0; colIndex < COLOR_GRID_SIZE; colIndex++) {
			const idx = (rowIndex * COLOR_GRID_SIZE + colIndex) * 4;
			const rgb: RGB = {
				r: imageData.data[idx],
				g: imageData.data[idx + 1],
				b: imageData.data[idx + 2],
			};
			row.push(rgbToOklab(rgb));
		}
		colors.push(row);
	}

	return { colors };
}

/**
 * Render a tessera onto a canvas. Draws a solid color derived from the file
 * name; actual preview-image loading is not yet implemented.
 */
async function createTesseraImage(
	tessera: TesseraInfo,
	size: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
	const canvas = canvasCreator(size, size);
	const ctx = canvas.getContext("2d");

	if (ctx && tessera.previewUrl) {
		const isRed = /red/i.test(tessera.fileName);
		ctx.fillStyle = isRed ? "red" : "blue";
		ctx.fillRect(0, 0, size, size);
	}

	return canvas;
}
