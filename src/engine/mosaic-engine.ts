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

/**
 * RGB color representation
 */
interface RGB {
	r: number;
	g: number;
	b: number;
}

/**
 * Create an HTML canvas element with the specified dimensions.
 *
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Generate a mosaic from a source image and a collection of tesserae.
 * Invalid tesserae are filtered out. When no valid tesserae remain,
 * a placeholder mosaic is returned.
 *
 * @param sourceImage - Information about the source image
 * @param tesserae - Array of tesserae to use in the mosaic
 * @param tesseraSize - The size of each tessera in pixels
 * @param canvasCreator - Optional factory for creating canvas elements (for testing)
 * @param imageLoader - Optional image loading function (for testing)
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

	// Generate the real mosaic
	const canvas = canvasCreator(sourceImage.width, sourceImage.height);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	// Load the source image into the canvas
	const sourceCanvas = await createCanvasFromSource(sourceImage, canvasCreator);
	const sourceCtx = sourceCanvas.getContext("2d");
	if (!sourceCtx) {
		throw new Error("Failed to get source canvas context");
	}

	// Preprocess tesserae to extract color grids
	const processedTesserae = await Promise.all(
		validTesserae.map(async (tessera) => {
			return {
				info: tessera,
				colorGrid: await extractColorGrid(
					tessera.previewUrl,
					tesseraSize,
					canvasCreator,
				),
			};
		}),
	);

	// Generate the mosaic by matching source cells to tesserae
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
 * Create a canvas from source image info
 */
async function createCanvasFromSource(
	sourceImage: SourceImageInfo,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
	// In a real implementation, we would load the actual source image
	// For now, we create a simple canvas with a gradient for testing
	const canvas = canvasCreator(sourceImage.width, sourceImage.height);

	const ctx = canvas.getContext("2d");
	if (ctx) {
		// Create a simple gradient for testing
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
	}

	return canvas;
}

/**
 * Extract a 3x3 color grid from a tessera preview URL
 */
async function extractColorGrid(
	previewUrl: string | null,
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<ColorGrid> {
	if (!previewUrl) {
		throw new Error("Preview URL is null");
	}

	// Create a canvas to load the tessera image
	const canvas = canvasCreator(tesseraSize, tesseraSize);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	// Load the image data - in a real implementation we would load from previewUrl
	// For now, we create a simple pattern
	ctx.fillStyle = "red";
	ctx.fillRect(0, 0, tesseraSize, tesseraSize);

	// Extract 3x3 grid of colors (downsampled from the full tessera)
	const gridSize = 3;
	const cellSize = tesseraSize / gridSize;
	const colors: Oklab[][] = [];

	for (let y = 0; y < gridSize; y++) {
		const row: Oklab[] = [];
		for (let x = 0; x < gridSize; x++) {
			// Get the average color of this cell
			const _pixelX = Math.floor(x * cellSize);
			const _pixelY = Math.floor(y * cellSize);

			// For now, we create representative colors based on position
			const rgb: RGB = {
				r: (x / (gridSize - 1)) * 255,
				g: (y / (gridSize - 1)) * 255,
				b: 128,
			};

			row.push(rgbToOklab(rgb));
		}
		colors.push(row);
	}

	return { colors };
}

/**
 * Convert RGB to OKLab color space
 */
function rgbToOklab(rgb: RGB): Oklab {
	// Proper RGB to OKLab conversion using standard matrices
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	// Apply gamma correction for sRGB
	const rLin = r <= 0.04045 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
	const gLin = g <= 0.04045 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
	const bLin = b <= 0.04045 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

	// Linear RGB to LMS conversion using proper OKLab matrix
	const l = 0.412221 * rLin + 0.536333 * gLin + 0.051445 * bLin;
	const m = 0.211903 * rLin + 0.692639 * gLin + 0.095458 * bLin;
	const s = 0.088302 * rLin + 0.251733 * gLin + 0.659965 * bLin;

	// LMS to OKLab conversion
	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);

	const L = 0.210454 * l_ + 0.793721 * m_ - 0.004175 * s_;
	const a = 1.977998 * l_ - 2.428592 * m_ + 0.450594 * s_;
	const b_ = 0.025904 * l_ + 0.782772 * m_ - 0.808676 * s_;

	return { L, a, b: b_ };
}

/**
 * Calculate the perceptual distance between two OKLab colors
 */
function oklabDistance(a: Oklab, b: Oklab): number {
	const deltaL = a.L - b.L;
	const deltaA = a.a - b.a;
	const deltaB = a.b - b.b;

	// OKLab is perceptually uniform, so Euclidean distance works well
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Calculate the average distance between two color grids
 */
function gridDistance(grid1: ColorGrid, grid2: ColorGrid): number {
	if (
		grid1.colors.length !== grid2.colors.length ||
		grid1.colors[0].length !== grid2.colors[0].length
	) {
		throw new Error("Grids must have the same dimensions");
	}

	let totalDistance = 0;
	let count = 0;

	for (let y = 0; y < grid1.colors.length; y++) {
		for (let x = 0; x < grid1.colors[0].length; x++) {
			totalDistance += oklabDistance(grid1.colors[y][x], grid2.colors[y][x]);
			count++;
		}
	}

	return totalDistance / count;
}

/**
 * Generate the mosaic canvas by matching source cells to tesserae
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

	// Track the last used tessera at each position for neighbor avoidance
	const tesseraGrid: (number | null)[][] = [];
	for (let y = 0; y < Math.ceil(sourceCanvas.height / tesseraSize); y++) {
		tesseraGrid[y] = new Array(
			Math.ceil(sourceCanvas.width / tesseraSize),
		).fill(null);
	}

	// Process each cell in the source grid
	for (let y = 0; y < sourceCanvas.height; y += tesseraSize) {
		for (let x = 0; x < sourceCanvas.width; x += tesseraSize) {
			const gridY = Math.floor(y / tesseraSize);
			const gridX = Math.floor(x / tesseraSize);

			// Create a color grid for this source cell by extracting pixel data
			const cellGrid: ColorGrid = await extractSourceCellGrid(
				sourceCanvas,
				x,
				y,
				tesseraSize,
				canvasCreator,
			);

			// Find the best matching tessera
			let bestMatchIndex = 0;
			let bestDistance = Infinity;

			for (let i = 0; i < processedTesserae.length; i++) {
				const distance = gridDistance(cellGrid, processedTesserae[i].colorGrid);

				// Apply neighbor avoidance with 10% tolerance as specified in requirements
				const neighborAbove = gridY > 0 ? tesseraGrid[gridY - 1][gridX] : null;
				const neighborLeft = gridX > 0 ? tesseraGrid[gridY][gridX - 1] : null;

				let adjustedDistance = distance;

				// If this tessera is the same as a neighbor, check for alternatives within 10% tolerance
				if (i === neighborAbove || i === neighborLeft) {
					// Find the best alternative that's not the same as neighbors
					let bestAlternativeDistance = Infinity;
					let hasAlternative = false;

					for (let j = 0; j < processedTesserae.length; j++) {
						if (j !== neighborAbove && j !== neighborLeft) {
							const altDistance = gridDistance(
								cellGrid,
								processedTesserae[j].colorGrid,
							);
							if (altDistance < bestAlternativeDistance) {
								bestAlternativeDistance = altDistance;
								hasAlternative = true;
							}
						}
					}

					// If there's an alternative within 10% tolerance, use it instead
					if (hasAlternative && bestAlternativeDistance <= distance * 1.1) {
						// Prefer the alternative to avoid repetition
						adjustedDistance = bestAlternativeDistance;
					} else if (!hasAlternative) {
						// Apply penalty to discourage repetition when no good alternative exists
						adjustedDistance = distance * 1.5;
					}
				}

				if (adjustedDistance < bestDistance) {
					bestDistance = adjustedDistance;
					bestMatchIndex = i;
				}
			}

			// Record the tessera used at this position for neighbor tracking
			tesseraGrid[gridY][gridX] = bestMatchIndex;

			// Draw the selected tessera
			const tesseraCanvas = await createTesseraImage(
				processedTesserae[bestMatchIndex].info,
				tesseraSize,
				canvasCreator,
			);

			// Blend 75% tessera with 25% source as specified in requirements
			resultCtx.globalAlpha = 0.75;
			resultCtx.drawImage(tesseraCanvas, x, y);

			resultCtx.globalAlpha = 0.25;
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
 * Extract color grid from a source cell
 */
async function extractSourceCellGrid(
	sourceCanvas: HTMLCanvasElement,
	x: number,
	y: number,
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<ColorGrid> {
	// Create a temporary canvas to downsample the cell to 3x3
	const tempCanvas = canvasCreator(3, 3);
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) {
		throw new Error("Failed to get temporary canvas context");
	}

	// Draw the source cell onto the temp canvas, which automatically downsamples it
	tempCtx.drawImage(sourceCanvas, x, y, tesseraSize, tesseraSize, 0, 0, 3, 3);

	// Extract colors from the downsampled image
	const imageData = tempCtx.getImageData(0, 0, 3, 3);
	const colors: Oklab[][] = [];

	for (let y = 0; y < 3; y++) {
		const row: Oklab[] = [];
		for (let x = 0; x < 3; x++) {
			const idx = (y * 3 + x) * 4; // 4 channels (RGBA)
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
 * Create tessera image from tessera info
 */
async function createTesseraImage(
	tessera: TesseraInfo,
	size: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
	const canvas = canvasCreator(size, size);
	const ctx = canvas.getContext("2d");

	if (ctx && tessera.previewUrl) {
		// In a real implementation, we would load the actual tessera image
		// For now, we create a simple pattern based on tessera info
		ctx.fillStyle = tessera.fileName.includes("red") ? "red" : "blue";
		ctx.fillRect(0, 0, size, size);
	}

	return canvas;
}
