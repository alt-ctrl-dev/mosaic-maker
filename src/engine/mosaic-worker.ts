import {
	COLOR_GRID_SIZE,
	BLEND_SOURCE_ALPHA,
	ANDROID_READBACK_FAILURE,
	rgbToOklab,
	selectTessera as sharedSelectTessera,
	type ColorGrid,
	type Oklab,
} from "./mosaic-shared";
import {
	runDeviceCapacityPreflight,
	estimateWorkload,
} from "./device-capacity-preflight";

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
}

/** Request to start mosaic generation. */
interface GenerateMosaicRequest {
	type: "generate";
	sourceImage: WorkerSourceImage;
	tesserae: WorkerTessera[];
	tesseraSize: number;
	sessionId: string | null;
}

/** Request to cancel in-progress generation. */
interface CancelRequest {
	type: "cancel";
}

/** Union of all messages the worker accepts. */
type WorkerMessage = GenerateMosaicRequest | CancelRequest;

let isCancelled = false;
let sessionId: string | null = null;
let startTime: number | null = null;
const phaseTimings: Record<string, number> = {};
let currentPhaseStart: number | null = null;
let workloadInfo: {
	gridCellCount: number;
	tesseraCount: number;
	outputPixels: number;
	estimatedMemoryUsage: number;
} | null = null;

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

/** Downsample a region of a canvas to a 3×3 OKLab color grid. */
function sampleColorGrid(
	source: OffscreenCanvas,
	offsetX: number,
	offsetY: number,
	regionWidth: number,
	regionHeight: number,
	reusableCtx?: OffscreenCanvasRenderingContext2D,
): ColorGrid {
	let tempCtx: OffscreenCanvasRenderingContext2D;

	if (reusableCtx) {
		tempCtx = reusableCtx;
		tempCtx.clearRect(0, 0, COLOR_GRID_SIZE, COLOR_GRID_SIZE);
	} else {
		const tempCanvas = createCanvas(COLOR_GRID_SIZE, COLOR_GRID_SIZE);
		const ctx = tempCanvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get temporary canvas context");
		}
		tempCtx = ctx;
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

	const imageData = tempCtx.getImageData(
		0,
		0,
		COLOR_GRID_SIZE,
		COLOR_GRID_SIZE,
	);
	const { data } = imageData;

	const colors: Oklab[][] = [];
	for (let rowIndex = 0; rowIndex < COLOR_GRID_SIZE; rowIndex++) {
		const row: Oklab[] = [];
		for (let colIndex = 0; colIndex < COLOR_GRID_SIZE; colIndex++) {
			const idx = (rowIndex * COLOR_GRID_SIZE + colIndex) * 4;
			row.push(
				rgbToOklab({ r: data[idx], g: data[idx + 1], b: data[idx + 2] }),
			);
		}
		colors.push(row);
	}

	return { colors };
}

async function renderTessera(
	tessera: WorkerTessera,
	tesseraSize: number,
): Promise<OffscreenCanvas> {
	if (!tessera.previewUrl) {
		throw new Error(`Tessera "${tessera.fileName}" has no preview image`);
	}

	const canvas = createCanvas(tesseraSize, tesseraSize);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get tessera canvas context");
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

/** Start the generation timer, recording the initial phase start. */
function startTiming(): void {
	startTime = performance.now();
	currentPhaseStart = startTime;
}

/** Record elapsed time for the named phase and reset the phase timer. */
function markPhase(phase: string): void {
	if (currentPhaseStart !== null && startTime !== null) {
		const now = performance.now();
		phaseTimings[phase] = now - currentPhaseStart;
		currentPhaseStart = now;
	}
}

/**
 * End timing, mark the final phase, and post a timing event with the given
 * outcome back to the main thread.
 */
function endTiming(outcome: "completed" | "cancelled" | "failed"): void {
	if (startTime === null) return;

	const endTime = performance.now();
	const totalTime = endTime - startTime;

	if (currentPhaseStart !== null) {
		phaseTimings.final = endTime - currentPhaseStart;
	}

	const eventData: Record<string, unknown> = {
		outcome,
		totalTime,
		phases: phaseTimings,
		sessionId,
	};

	if (workloadInfo) {
		eventData.gridCellCount = workloadInfo.gridCellCount;
		eventData.tesseraCount = workloadInfo.tesseraCount;
		eventData.outputPixels = workloadInfo.outputPixels;
		eventData.estimatedMemoryUsage = workloadInfo.estimatedMemoryUsage;
	}

	self.postMessage({
		type: "timing",
		data: eventData,
	});
}

/** Fill the result canvas cell by cell, reporting progress. */
async function generateMosaicCanvas(
	sourceCanvas: OffscreenCanvas,
	processedTesserae: ProcessedTessera[],
	tesseraSize: number,
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

	// Reuse a single temporary canvas for color sampling to reduce allocations
	const tempCanvas = createCanvas(COLOR_GRID_SIZE, COLOR_GRID_SIZE);
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) {
		throw new Error("Failed to get temporary canvas context");
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

			const cellGrid = sampleColorGrid(
				sourceCanvas,
				x,
				y,
				tesseraSize,
				tesseraSize,
				tempCtx,
			);

			const bestMatchIndex = selectTessera(
				cellGrid,
				processedTesserae,
				gridY > 0 ? tesseraGrid[gridY - 1][gridX] : null,
				gridX > 0 ? tesseraGrid[gridY][gridX - 1] : null,
			);

			tesseraGrid[gridY][gridX] = bestMatchIndex;

			resultCtx.globalAlpha = 1;
			resultCtx.drawImage(processedTesserae[bestMatchIndex].canvas, x, y);

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
): Promise<{ dataUrl: string; width: number; height: number }> {
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

	// Calculate workload information
	const workload = estimateWorkload(
		gridCellCount,
		validTesserae.length,
		sourceImage.width,
		sourceImage.height,
	);
	workloadInfo = workload;

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

	markPhase("initial");
	self.postMessage({
		type: "progress",
		percent: 10,
		message: "Loading source image...",
	});
	const sourceCanvas = await createCanvasFromSource(sourceImage);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	markPhase("loading_source");
	self.postMessage({
		type: "progress",
		percent: 30,
		message: "Processing tesserae...",
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

	markPhase("processing_tesserae");
	self.postMessage({
		type: "progress",
		percent: 70,
		message: "Generating mosaic...",
	});
	const resultCanvas = await generateMosaicCanvas(
		sourceCanvas,
		processedTesserae,
		tesseraSize,
	);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	markPhase("generating_mosaic");
	self.postMessage({
		type: "progress",
		percent: 95,
		message: "Creating final image...",
	});
	const dataUrl = await offscreenCanvasToDataUrl(resultCanvas, "image/png");

	markPhase("creating_final_image");
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
			sessionId = message.sessionId;
			startTiming();
			try {
				const result = await generateMosaicWithProgress(
					message.sourceImage,
					message.tesserae,
					message.tesseraSize,
				);

				if (isCancelled) {
					endTiming("cancelled");
					self.postMessage({
						type: "result",
						dataUrl: "",
						width: 0,
						height: 0,
					});
				} else {
					endTiming("completed");
					self.postMessage({
						type: "result",
						dataUrl: result.dataUrl,
						width: result.width,
						height: result.height,
					});
				}
			} catch (error) {
				endTiming("failed");
				self.postMessage({
					type: "error",
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
			}
			break;
	}
};
