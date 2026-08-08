// Worker message types
interface GenerateMosaicRequest {
	type: "generate";
	sourceImage: {
		width: number;
		height: number;
		url: string;
		orientation: number;
	};
	tesserae: Array<{
		file: any;
		fileName: string;
		isValid: boolean;
		error: string | null;
		isLowResolution: boolean;
		previewUrl: string | null;
	}>;
	tesseraSize: number;
}

interface CancelRequest {
	type: "cancel";
}

interface ProgressUpdate {
	type: "progress";
	percent: number;
	message: string;
}

interface ResultMessage {
	type: "result";
	dataUrl: string;
	width: number;
	height: number;
}

interface ErrorMessage {
	type: "error";
	message: string;
}

type WorkerMessage = GenerateMosaicRequest | CancelRequest;
type WorkerResponse = ProgressUpdate | ResultMessage | ErrorMessage;

// Global state for cancellation
let isCancelled = false;

// RGB and Oklab interfaces (copied from mosaic-engine.ts)
interface RGB {
	r: number;
	g: number;
	b: number;
}

interface Oklab {
	L: number;
	a: number;
	b: number;
}

interface ColorGrid {
	colors: Oklab[][];
}

interface ProcessedTessera {
	info: {
		file: any;
		fileName: string;
		isValid: boolean;
		error: string | null;
		isLowResolution: boolean;
		previewUrl: string | null;
	};
	colorGrid: ColorGrid;
	canvas: any; // OffscreenCanvas or ImageBitmap
}

// Constants (copied from mosaic-engine.ts)
const COLOR_GRID_SIZE = 3;
const BLEND_SOURCE_ALPHA = 0.25;
const ALTERNATIVE_TOLERANCE = 1.1;

// Create an OffscreenCanvas or fallback canvas
function createCanvas(
	width: number,
	height: number,
):
	| any
	| OffscreenCanvas
	| {
			width: number;
			height: number;
			getContext: () => any;
			convertToBlob?: () => Promise<Blob>;
			toDataURL?: () => string;
	  } {
	if (typeof OffscreenCanvas !== "undefined") {
		return new OffscreenCanvas(width, height);
	} else {
		// Fallback for browsers without OffscreenCanvas
		const canvas: any = {
			width,
			height,
			getContext: () => {
				return {
					fillStyle: "",
					fillRect: () => {},
					drawImage: () => {},
					getImageData: () => ({
						data: new Uint8ClampedArray(width * height * 4),
						width,
						height,
					}),
					globalAlpha: 1,
					globalCompositeOperation: "source-over",
				};
			},
			convertToBlob: () => Promise.resolve(new Blob()),
			toDataURL: () => "data:image/png;base64,placeholder",
		};
		return canvas;
	}
}

// Load image as ImageBitmap in worker environment
async function loadImage(
	dataUrl: string,
): Promise<any | ImageBitmap | { width: number; height: number }> {
	if (
		typeof fetch !== "undefined" &&
		typeof createImageBitmap !== "undefined"
	) {
		try {
			const response = await fetch(dataUrl);
			const blob = await response.blob();
			return await createImageBitmap(blob);
		} catch (error) {
			throw new Error(`Failed to load image: ${error}`);
		}
	} else {
		// Fallback for environments without fetch or createImageBitmap
		return Promise.resolve({
			width: 100,
			height: 100,
		});
	}
}

// Post message back to main thread
function postMessage(message: WorkerResponse) {
	self.postMessage(message);
}

// Report progress during generation
function reportProgress(percent: number, message: string) {
	if (!isCancelled) {
		postMessage({
			type: "progress",
			percent,
			message,
		});
	}
}

// Convert an sRGB color to the perceptually uniform OKLab color space.
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

// Apply sRGB gamma linearization.
function linearize(channel: number): number {
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

// Calculate the Euclidean distance between two OKLab colors.
function oklabDistance(a: Oklab, b: Oklab): number {
	const deltaL = a.L - b.L;
	const deltaA = a.a - b.a;
	const deltaB = a.b - b.b;

	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

// Calculate the average perceptual distance between two color grids.
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

// Choose the tessera for a cell, preferring the closest colour match but
// avoiding the tesserae used directly above and to the left when an
// alternative is within tolerance of the best score.
function selectTessera(
	cellGrid: ColorGrid,
	processedTesserae: ProcessedTessera[],
	neighborAbove: number | null,
	neighborLeft: number | null,
): number {
	let bestIndex = 0;
	let bestDistance = Infinity;
	let bestNonNeighborIndex: number | null = null;
	let bestNonNeighborDistance = Infinity;

	for (let i = 0; i < processedTesserae.length; i++) {
		const distance = averageGridDistance(
			cellGrid,
			processedTesserae[i].colorGrid,
		);

		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = i;
		}

		const isNeighbor = i === neighborAbove || i === neighborLeft;
		if (!isNeighbor && distance < bestNonNeighborDistance) {
			bestNonNeighborDistance = distance;
			bestNonNeighborIndex = i;
		}
	}

	const bestIsNeighbor =
		bestIndex === neighborAbove || bestIndex === neighborLeft;

	if (
		bestIsNeighbor &&
		bestNonNeighborIndex !== null &&
		bestNonNeighborDistance <= bestDistance * ALTERNATIVE_TOLERANCE
	) {
		return bestNonNeighborIndex;
	}

	return bestIndex;
}

// Downsample a rectangular region of a canvas to a COLOR_GRID_SIZE×COLOR_GRID_SIZE OKLab color grid.
function sampleColorGrid(
	source: any, // Canvas or OffscreenCanvas
	offsetX: number,
	offsetY: number,
	regionWidth: number,
	regionHeight: number,
): ColorGrid {
	const tempCanvas = createCanvas(COLOR_GRID_SIZE, COLOR_GRID_SIZE);
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

	// For OffscreenCanvas, we need to handle ImageData differently
	let data: Uint8ClampedArray | number[];
	if (tempCtx.getImageData) {
		const imageData = tempCtx.getImageData(
			0,
			0,
			COLOR_GRID_SIZE,
			COLOR_GRID_SIZE,
		);
		data = imageData.data;
	} else {
		// Fallback for simplified canvas mock
		data = new Uint8ClampedArray(COLOR_GRID_SIZE * COLOR_GRID_SIZE * 4);
	}

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

// Render a tessera's preview image onto a square canvas at the mosaic's tessera size.
async function renderTessera(
	tessera: {
		file: any;
		fileName: string;
		isValid: boolean;
		error: string | null;
		isLowResolution: boolean;
		previewUrl: string | null;
	},
	tesseraSize: number,
): Promise<any | OffscreenCanvas> {
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

// Draw the source image onto a canvas at its natural size
async function createCanvasFromSource(sourceImage: any): Promise<any> {
	const canvas = createCanvas(sourceImage.width, sourceImage.height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get source canvas context");
	}

	const img = await loadImage(sourceImage.url);
	ctx.drawImage(img, 0, 0, sourceImage.width, sourceImage.height);

	return canvas;
}

// Modified generateMosaic function for worker use with progress reporting
async function generateMosaicWithProgress(
	sourceImage: any,
	tesserae: any[],
	tesseraSize: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
	if (tesseraSize <= 0) {
		throw new Error("Tessera size must be positive");
	}

	if (sourceImage.width <= 0 || sourceImage.height <= 0) {
		throw new Error("Source image dimensions must be positive");
	}

	const validTesserae = tesserae.filter((t) => t.isValid);

	if (validTesserae.length === 0) {
		const canvas = createCanvas(sourceImage.width, sourceImage.height);
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.fillStyle = "#f0f0f0";
			ctx.fillRect(0, 0, sourceImage.width, sourceImage.height);

			ctx.fillStyle = "#cccccc";
			for (let y = 0; y < sourceImage.height; y += 20) {
				const rowOffset = (y / 20) % 2 === 0 ? 0 : 10;
				for (let x = rowOffset; x < sourceImage.width; x += 20) {
					ctx.fillRect(x, y, 10, 10);
				}
			}
		}

		let dataUrl = "";
		if (canvas.convertToBlob) {
			const blob = await canvas.convertToBlob({ type: "image/png" });
			dataUrl = URL.createObjectURL(blob);
		} else {
			dataUrl = "data:image/png;base64,placeholder";
		}

		return {
			dataUrl,
			width: sourceImage.width,
			height: sourceImage.height,
		};
	}

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	reportProgress(10, "Loading source image...");
	const sourceCanvas = await createCanvasFromSource(sourceImage);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	reportProgress(30, "Processing tesserae...");
	const processedTesserae = [];
	for (let i = 0; i < validTesserae.length; i++) {
		if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

		const tessera = validTesserae[i];
		const canvas = await renderTessera(tessera, tesseraSize);

		// Create color grid for the tessera
		const colorGrid = sampleColorGrid(canvas, 0, 0, tesseraSize, tesseraSize);

		processedTesserae.push({
			info: tessera,
			canvas,
			colorGrid,
		});

		// Report progress based on tessera processing
		const progress = 30 + (i / validTesserae.length) * 30;
		if (i % 5 === 0) {
			// Report every 5 tesserae to avoid excessive messages
			reportProgress(
				Math.round(progress),
				`Processed ${i + 1} of ${validTesserae.length} tesserae`,
			);
		}
	}

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	reportProgress(70, "Generating mosaic...");
	const resultCanvas = await generateMosaicCanvas(
		sourceCanvas,
		processedTesserae,
		tesseraSize,
	);

	if (isCancelled) return { dataUrl: "", width: 0, height: 0 };

	reportProgress(90, "Creating final image...");
	let dataUrl = "";
	if (resultCanvas.convertToBlob) {
		const blob = await resultCanvas.convertToBlob({ type: "image/png" });
		dataUrl = URL.createObjectURL(blob);
	} else if (resultCanvas.toDataURL) {
		dataUrl = resultCanvas.toDataURL("image/png");
	} else {
		dataUrl = "data:image/png;base64,generated";
	}

	return {
		dataUrl,
		width: sourceImage.width,
		height: sourceImage.height,
	};
}

// Fill the result canvas by matching each source-grid cell to the best tessera
async function generateMosaicCanvas(
	sourceCanvas: any,
	processedTesserae: ProcessedTessera[],
	tesseraSize: number,
): Promise<any> {
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
				const percent = 70 + Math.round((cellCount / totalCells) * 25);
				reportProgress(
					percent,
					`Generating cell ${cellCount + 1} of ${totalCells}...`,
				);
			}
			cellCount++;

			// Sample the color grid for this cell
			const cellGrid = sampleColorGrid(
				sourceCanvas,
				x,
				y,
				tesseraSize,
				tesseraSize,
			);

			// Select the best tessera for this cell
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

	if (!isCancelled) {
		reportProgress(95, "Finalizing mosaic...");
	}

	return resultCanvas;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "cancel":
			isCancelled = true;
			break;

		case "generate":
			try {
				isCancelled = false;

				const result = await generateMosaicWithProgress(
					message.sourceImage,
					message.tesserae,
					message.tesseraSize,
				);

				if (isCancelled) {
					postMessage({
						type: "result",
						dataUrl: "",
						width: 0,
						height: 0,
					});
				} else {
					postMessage({
						type: "result",
						dataUrl: result.dataUrl,
						width: result.width,
						height: result.height,
					});
				}
			} catch (error) {
				postMessage({
					type: "error",
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
				});
			}
			break;
	}
};
