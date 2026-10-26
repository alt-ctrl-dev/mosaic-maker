import { runDeviceCapacityPreflight } from "./device-capacity-preflight";
import {
	ANDROID_READBACK_FAILURE,
	BLEND_SOURCE_ALPHA,
	type ColorGrid,
	selectTessera as sharedSelectTessera,
} from "./mosaic-shared";
import SourceSamplerWorker from "./source-sampler-worker.ts?worker";
import {
	PACKED_GRID_LENGTH,
	sampleCellGrids,
	sampleColorGrid,
	splitIntoBands,
	unpackColorGrid,
} from "./source-sampling";
import type { MosaicMode } from "./workflow-state";

/** Source image data received from the main thread. */
interface WorkerSourceImage {
	width: number;
	height: number;
	url: string;
	orientation: number;
}

/**
 * Tessera data received from the main thread.
 *
 * Only the fields the worker actually reads are transferred; the full
 * TesseraInfo carries a File per tessera that the worker never touches, so
 * narrowing the payload avoids wasting structured-clone bandwidth on image
 * bytes it does not read.
 */
interface WorkerTessera {
	fileName: string;
	isValid: boolean;
	previewUrl: string | null;
	/** Flat hex colour for synthetic brick-mode tesserae; absent for photomosaic tesserae. */
	color?: string;
}

/** Request to start mosaic generation. */
interface GenerateMosaicRequest {
	type: "generate";
	sourceImage: WorkerSourceImage;
	tesserae: WorkerTessera[];
	tesseraSize: number;
	mode: MosaicMode;
}

/** Request to cancel in-progress generation. */
interface CancelRequest {
	type: "cancel";
}

/** Union of all messages the worker accepts. */
type WorkerMessage = GenerateMosaicRequest | CancelRequest;

let isCancelled = false;

interface ProcessedTessera {
	info: WorkerTessera;
	colorGrid: ColorGrid;
	canvas: OffscreenCanvas;
}

function createCanvas(width: number, height: number): OffscreenCanvas {
	return new OffscreenCanvas(width, height);
}

/** Load an image from a data URL into an ImageBitmap. */
async function loadImage(dataUrl: string): Promise<ImageBitmap> {
	try {
		const response = await fetch(dataUrl);
		const blob = await response.blob();
		return createImageBitmap(blob);
	} catch (error) {
		throw new Error(`Failed to load image: ${error}`);
	}
}

/** Convert a Blob to a base64 data URL using FileReader. */
async function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
		reader.readAsDataURL(blob);
	});
}

/**
 * Convert an OffscreenCanvas to a PNG data URL via {@link OffscreenCanvas.convertToBlob}.
 *
 * When the browser cannot complete the GPU readback (a known limitation on
 * some Android devices), this throws a sentinel error so the caller can fall
 * back to main-thread processing where a regular canvas does not have the same
 * restriction.
 *
 * @throws An error whose message starts with {@link ANDROID_READBACK_FAILURE}
 *   when the browser reports a readback failure.
 */
export async function offscreenCanvasToDataUrl(
	canvas: OffscreenCanvas,
	type: string = "image/png",
): Promise<string> {
	try {
		const blob = await canvas.convertToBlob({ type });
		return await blobToDataUrl(blob);
	} catch (error) {
		if (error instanceof DOMException && /readback/i.test(error.message)) {
			console.warn("OffscreenCanvas readback failed:", error);
			throw new Error(
				`${ANDROID_READBACK_FAILURE}: failed to read back the canvas on this device.`,
			);
		}

		throw error;
	}
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

async function renderTessera(
	tessera: WorkerTessera,
	tesseraSize: number,
): Promise<OffscreenCanvas> {
	const canvas = createCanvas(tesseraSize, tesseraSize);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get tile canvas context");
	}

	if (tessera.color) {
		ctx.fillStyle = tessera.color;
		ctx.fillRect(0, 0, tesseraSize, tesseraSize);
		return canvas;
	}

	if (!tessera.previewUrl) {
		throw new Error(`Tile "${tessera.fileName}" has no preview image`);
	}

	const img = await loadImage(tessera.previewUrl);
	ctx.drawImage(img, 0, 0, tesseraSize, tesseraSize);

	return canvas;
}

async function createCanvasFromSource(
	sourceImage: WorkerSourceImage,
): Promise<OffscreenCanvas> {
	const canvas = createCanvas(sourceImage.width, sourceImage.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get source canvas context");
	}

	const img = await loadImage(sourceImage.url);
	ctx.drawImage(img, 0, 0, sourceImage.width, sourceImage.height);

	return canvas;
}

/** Sample one band of the source in its own worker. */
function sampleBandInWorker(
	band: ImageBitmap,
	tesseraSize: number,
): Promise<Float64Array> {
	return new Promise((resolve, reject) => {
		const worker = new SourceSamplerWorker();
		worker.onmessage = (event) => {
			worker.terminate();
			if (event.data.type === "result") resolve(event.data.grids);
			else reject(new Error(event.data.message));
		};
		worker.onerror = (event) => {
			worker.terminate();
			reject(new Error(event.message || "Source sampler worker failed"));
		};
		worker.postMessage({ band, tesseraSize }, [band]);
	});
}

/**
 * Sample every source cell's color grid, row-major, split across a pool of
 * worker threads by horizontal band. Falls back to sampling in this worker
 * when nested workers are unavailable.
 */
async function sampleSourceInParallel(
	sourceCanvas: OffscreenCanvas,
	tesseraSize: number,
): Promise<Float64Array> {
	if (typeof Worker === "undefined") {
		return sampleCellGrids(sourceCanvas, tesseraSize);
	}

	// Leave one core for this worker, which processes tesserae meanwhile.
	const poolSize = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
	const bands = splitIntoBands(sourceCanvas.height, tesseraSize, poolSize);
	const results = await Promise.all(
		bands.map(async ({ y, height }) =>
			sampleBandInWorker(
				await createImageBitmap(sourceCanvas, 0, y, sourceCanvas.width, height),
				tesseraSize,
			),
		),
	);

	const cols = Math.ceil(sourceCanvas.width / tesseraSize);
	const packed = new Float64Array(
		cols * Math.ceil(sourceCanvas.height / tesseraSize) * PACKED_GRID_LENGTH,
	);
	let offset = 0;
	for (const grids of results) {
		packed.set(grids, offset);
		offset += grids.length;
	}
	return packed;
}

/** Fill the result canvas cell by cell, reporting progress. */
async function generateMosaicCanvas(
	sourceCanvas: OffscreenCanvas,
	cellGrids: Float64Array,
	processedTesserae: ProcessedTessera[],
	tesseraSize: number,
	mode: MosaicMode,
): Promise<OffscreenCanvas> {
	const resultCanvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
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

			if (isCancelled) return resultCanvas;

			if (cellCount % Math.max(1, Math.floor(totalCells / 20)) === 0) {
				const progressPercent = 70 + Math.round((cellCount / totalCells) * 25);
				self.postMessage({
					type: "progress",
					percent: progressPercent,
					message: `Generating cell ${cellCount + 1} of ${totalCells}...`,
				});
			}
			cellCount++;

			const cellGrid = unpackColorGrid(cellGrids, gridY * gridCols + gridX);

			const bestMatchIndex = selectTessera(
				cellGrid,
				processedTesserae,
				gridY > 0 ? tesseraGrid[gridY - 1][gridX] : null,
				gridX > 0 ? tesseraGrid[gridY][gridX - 1] : null,
			);

			tesseraGrid[gridY][gridX] = bestMatchIndex;

			resultCtx.globalAlpha = 1;
			resultCtx.drawImage(processedTesserae[bestMatchIndex].canvas, x, y);

			if (mode === "photomosaic") {
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
			}

			resultCtx.globalAlpha = 1.0;
		}
	}

	return resultCanvas;
}

/**
 * Generate a placeholder mosaic (checkerboard pattern) when no valid tesserae
 * are available. Returns a data URL so no object URL cleanup is needed.
 */
async function generatePlaceholderMosaic(
	width: number,
	height: number,
): Promise<string> {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
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

	return offscreenCanvasToDataUrl(canvas, "image/png");
}

async function generateMosaicWithProgress(
	sourceImage: WorkerSourceImage,
	tesserae: WorkerTessera[],
	tesseraSize: number,
	mode: MosaicMode = "photomosaic",
): Promise<{ dataUrl: string; width: number; height: number }> {
	if (tesseraSize <= 0) {
		throw new Error("Tile size must be positive");
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
		const dataUrl = await generatePlaceholderMosaic(
			sourceImage.width,
			sourceImage.height,
		);
		return { dataUrl, width: sourceImage.width, height: sourceImage.height };
	}

	self.postMessage({
		type: "progress",
		percent: 10,
		message: "Loading source image...",
	});
	const sourceCanvas = await createCanvasFromSource(sourceImage);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	// Sample source cells in parallel workers while tesserae are processed below.
	const cellGridsPromise = sampleSourceInParallel(sourceCanvas, tesseraSize);
	// Avoid an unhandled rejection if tessera processing fails first.
	cellGridsPromise.catch(() => {});

	self.postMessage({
		type: "progress",
		percent: 30,
		message: "Processing tiles...",
	});
	const processedTesserae: ProcessedTessera[] = [];
	for (let i = 0; i < validTesserae.length; i++) {
		if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

		const tessera = validTesserae[i];
		const canvas = await renderTessera(tessera, tesseraSize);
		const colorGrid = sampleColorGrid(canvas, 0, 0, tesseraSize, tesseraSize);

		processedTesserae.push({ info: tessera, canvas, colorGrid });

		if (i % 5 === 0) {
			const progress = 30 + (i / validTesserae.length) * 30;
			self.postMessage({
				type: "progress",
				percent: Math.round(progress),
				message: `Processed ${i + 1} of ${validTesserae.length} tesserae`,
			});
		}
	}

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	self.postMessage({
		type: "progress",
		percent: 70,
		message: "Generating mosaic...",
	});
	const cellGrids = await cellGridsPromise;

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	const resultCanvas = await generateMosaicCanvas(
		sourceCanvas,
		cellGrids,
		processedTesserae,
		tesseraSize,
		mode,
	);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	self.postMessage({
		type: "progress",
		percent: 95,
		message: "Creating final image...",
	});
	const dataUrl = await offscreenCanvasToDataUrl(resultCanvas, "image/png");

	self.postMessage({
		type: "progress",
		percent: 100,
		message: "Mosaic complete",
	});

	return { dataUrl, width: sourceImage.width, height: sourceImage.height };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "cancel":
			isCancelled = true;
			break;

		case "generate":
			isCancelled = false;
			try {
				const result = await generateMosaicWithProgress(
					message.sourceImage,
					message.tesserae,
					message.tesseraSize,
					message.mode,
				);

				if (isCancelled) {
					self.postMessage({
						type: "result",
						dataUrl: "",
						width: 0,
						height: 0,
					});
				} else {
					self.postMessage({
						type: "result",
						dataUrl: result.dataUrl,
						width: result.width,
						height: result.height,
					});
				}
			} catch (error) {
				self.postMessage({
					type: "error",
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
			}
			break;
	}
};
