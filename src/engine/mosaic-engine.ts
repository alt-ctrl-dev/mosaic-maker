import { createCanvas, loadImage } from "./export";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";
import { runDeviceCapacityPreflight } from "./device-capacity-preflight";
import {
	COLOR_GRID_SIZE,
	BLEND_SOURCE_ALPHA,
	rgbToOklab,
	selectTessera as sharedSelectTessera,
	type ColorGrid,
	type Oklab,
	type RGB,
} from "./mosaic-shared";

/** Progress callback function type */
export type ProgressCallback = (percent: number, message: string) => void;

/**
 * Result of a mosaic generation operation.
 */
export interface MosaicResult {
	/** The mosaic image as a PNG data URL */
	dataUrl: string;
	/** Width of the mosaic in pixels */
	width: number;
	/** Height of the mosaic in pixels */
	height: number;
}

/**
 * Tessera with precomputed color grid for matching
 */
interface ProcessedTessera {
	info: TesseraInfo;
	colorGrid: ColorGrid;
	/** The tessera rendered at tessera size, ready to draw into the mosaic */
	canvas: HTMLCanvasElement;
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
 * @param progressCallback - Optional callback for progress reporting
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
	imageLoader: (url: string) => Promise<HTMLImageElement> = loadImage,
	progressCallback?: ProgressCallback,
): Promise<MosaicResult> {
	if (tesseraSize <= 0) {
		throw new Error("Tessera size must be positive");
	}

	if (sourceImage.width <= 0 || sourceImage.height <= 0) {
		throw new Error("Source image dimensions must be positive");
	}

	const validTesserae = tesserae.filter((t) => t.isValid);

	// Calculate grid cell count for preflight check
	const gridCellCount =
		Math.ceil(sourceImage.width / tesseraSize) *
		Math.ceil(sourceImage.height / tesseraSize);

	// Run device capacity preflight before heavy processing
	const preflightResult = runDeviceCapacityPreflight(
		gridCellCount,
		validTesserae.length,
		sourceImage.width,
		sourceImage.height,
	);

	if (!preflightResult.isSafe) {
		throw new Error(
			`Device capacity exceeded: ${preflightResult.reason}. ${preflightResult.remedy}`,
		);
	}

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

	if (progressCallback) progressCallback(10, "Loading source image...");

	const sourceCanvas = await createCanvasFromSource(
		sourceImage,
		canvasCreator,
		imageLoader,
	);

	const processedTesserae = [];
	for (let i = 0; i < validTesserae.length; i++) {
		if (progressCallback && i % 5 === 0) {
			const percent = 10 + Math.round((i / validTesserae.length) * 40);
			progressCallback(
				percent,
				`Processing tessera ${i + 1} of ${validTesserae.length}...`,
			);
		}

		const tessera = validTesserae[i];
		const canvas = await renderTessera(
			tessera,
			tesseraSize,
			canvasCreator,
			imageLoader,
		);
		processedTesserae.push({
			info: tessera,
			colorGrid: sampleColorGrid(
				canvas,
				0,
				0,
				tesseraSize,
				tesseraSize,
				canvasCreator,
			),
			canvas,
		});
	}

	if (progressCallback) progressCallback(70, "Generating mosaic...");

	const resultCanvas = await generateMosaicCanvas(
		sourceCanvas,
		processedTesserae,
		tesseraSize,
		canvasCreator,
		progressCallback,
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
 * Draw the source image onto a canvas at its natural size so its pixels can be
 * sampled during matching and blending.
 */
async function createCanvasFromSource(
	sourceImage: SourceImageInfo,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
	imageLoader: (url: string) => Promise<HTMLImageElement>,
): Promise<HTMLCanvasElement> {
	const canvas = canvasCreator(sourceImage.width, sourceImage.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get source canvas context");
	}

	const img = await imageLoader(sourceImage.url);
	ctx.drawImage(img, 0, 0, sourceImage.width, sourceImage.height);

	return canvas;
}

/**
 * Render a tessera's preview image onto a square canvas at the mosaic's
 * tessera size.
 */
async function renderTessera(
	tessera: TesseraInfo,
	tesseraSize: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
	imageLoader: (url: string) => Promise<HTMLImageElement>,
): Promise<HTMLCanvasElement> {
	if (!tessera.previewUrl) {
		throw new Error(`Tessera "${tessera.fileName}" has no preview image`);
	}

	const canvas = canvasCreator(tesseraSize, tesseraSize);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get tessera canvas context");
	}

	const img = await imageLoader(tessera.previewUrl);
	ctx.drawImage(img, 0, 0, tesseraSize, tesseraSize);

	return canvas;
}

/**
 * Downsample a rectangular region of a canvas to a
 * {@link COLOR_GRID_SIZE}&times;{@link COLOR_GRID_SIZE} OKLab color grid.
 */
function sampleColorGrid(
	source: HTMLCanvasElement,
	offsetX: number,
	offsetY: number,
	regionWidth: number,
	regionHeight: number,
	canvasCreator: (width: number, height: number) => HTMLCanvasElement,
): ColorGrid {
	const tempCanvas = canvasCreator(COLOR_GRID_SIZE, COLOR_GRID_SIZE);
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) {
		throw new Error("Failed to get temporary canvas context");
	}

	tempCtx.drawImage(
		source,
		offsetX,
		offsetY,
		regionWidth,
		regionHeight,
		0,
		0,
		COLOR_GRID_SIZE,
		COLOR_GRID_SIZE,
	);

	const { data } = tempCtx.getImageData(0, 0, COLOR_GRID_SIZE, COLOR_GRID_SIZE);
	const colors: Oklab[][] = [];

	for (let rowIndex = 0; rowIndex < COLOR_GRID_SIZE; rowIndex++) {
		const row: Oklab[] = [];
		for (let colIndex = 0; colIndex < COLOR_GRID_SIZE; colIndex++) {
			const idx = (rowIndex * COLOR_GRID_SIZE + colIndex) * 4;
			const rgb: RGB = {
				r: data[idx],
				g: data[idx + 1],
				b: data[idx + 2],
			};
			row.push(rgbToOklab(rgb));
		}
		colors.push(row);
	}

	return { colors };
}

function selectTessera(
	cellGrid: ColorGrid,
	processedTesserae: ProcessedTessera[],
	neighborAbove: number | null,
	neighborLeft: number | null,
): number {
	return sharedSelectTessera(
		cellGrid,
		processedTesserae,
		(tessera) => tessera.colorGrid,
		neighborAbove,
		neighborLeft,
	);
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
	progressCallback?: ProgressCallback,
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

	let cellCount = 0;
	const totalCells = gridRows * gridCols;

	for (let y = 0; y < sourceCanvas.height; y += tesseraSize) {
		for (let x = 0; x < sourceCanvas.width; x += tesseraSize) {
			const gridY = Math.floor(y / tesseraSize);
			const gridX = Math.floor(x / tesseraSize);

			if (
				progressCallback &&
				cellCount % Math.max(1, Math.floor(totalCells / 20)) === 0
			) {
				const percent = 70 + Math.round((cellCount / totalCells) * 25);
				progressCallback(
					percent,
					`Generating cell ${cellCount + 1} of ${totalCells}...`,
				);
			}
			cellCount++;

			// Calculate clamped region size for edge cells
			const regionWidth = Math.min(tesseraSize, sourceCanvas.width - x);
			const regionHeight = Math.min(tesseraSize, sourceCanvas.height - y);

			const cellGrid = sampleColorGrid(
				sourceCanvas,
				x,
				y,
				regionWidth,
				regionHeight,
				canvasCreator,
			);

			const bestMatchIndex = selectTessera(
				cellGrid,
				processedTesserae,
				gridY > 0 ? tesseraGrid[gridY - 1][gridX] : null,
				gridX > 0 ? tesseraGrid[gridY][gridX - 1] : null,
			);

			tesseraGrid[gridY][gridX] = bestMatchIndex;

			// Draw the tessera opaquely first, then blend the source over it at 25%,
			// giving each mosaic pixel exactly 75% tessera / 25% source.
			resultCtx.globalAlpha = 1;
			resultCtx.drawImage(processedTesserae[bestMatchIndex].canvas, x, y);

			resultCtx.globalAlpha = BLEND_SOURCE_ALPHA;
			// Use clamped region size for edge cells to prevent sampling beyond canvas bounds
			resultCtx.drawImage(
				sourceCanvas,
				x,
				y,
				regionWidth,
				regionHeight,
				x,
				y,
				regionWidth,
				regionHeight,
			);

			resultCtx.globalAlpha = 1.0;
		}
	}

	if (progressCallback) progressCallback(95, "Finalizing mosaic...");

	return resultCanvas;
}
