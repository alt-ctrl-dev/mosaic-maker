/** Source image data received from the main thread. */
interface WorkerSourceImage {
	width: number;
	height: number;
	url: string;
	orientation: number;
}

/** Tessera data received from the main thread. */
interface WorkerTessera {
	file: unknown;
	fileName: string;
	isValid: boolean;
	error: string | null;
	isLowResolution: boolean;
	previewUrl: string | null;
}

/** Request to start mosaic generation. */
interface GenerateMosaicRequest {
	type: "generate";
	sourceImage: WorkerSourceImage;
	tesserae: WorkerTessera[];
	tesseraSize: number;
}

/** Request to cancel in-progress generation. */
interface CancelRequest {
	type: "cancel";
}

/** Union of all messages the worker accepts. */
type WorkerMessage = GenerateMosaicRequest | CancelRequest;

let isCancelled = false;

interface RGB {
	r: number;
	g: number;
	b: number;
}

/** Perceptually uniform OKLab color. */
interface Oklab {
	L: number;
	a: number;
	b: number;
}

interface ColorGrid {
	colors: Oklab[][];
}

interface ProcessedTessera {
	info: WorkerTessera;
	colorGrid: ColorGrid;
	canvas: OffscreenCanvas;
}

const COLOR_GRID_SIZE = 3;
const BLEND_SOURCE_ALPHA = 0.25;
const ALTERNATIVE_TOLERANCE = 1.1;

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

/** Apply sRGB gamma linearization. */
function linearize(channel: number): number {
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

/** Convert an sRGB color to OKLab. */
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

/** Euclidean distance between two OKLab colors (perceptually uniform). */
function oklabDistance(a: Oklab, b: Oklab): number {
	const deltaL = a.L - b.L;
	const deltaA = a.a - b.a;
	const deltaB = a.b - b.b;
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/** Average perceptual distance between two color grids. */
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

// ──── tessera selection ───────────────────────────────────────────────────

/**
 * Choose the best tessera for a cell, preferring the closest color match but
 * avoiding the tesserae used directly above and to the left when an alternative
 * is within {@link ALTERNATIVE_TOLERANCE} of the best score.
 */
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

/** Downsample a region of a canvas to a 3×3 OKLab color grid. */
function sampleColorGrid(
	source: OffscreenCanvas,
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

	let cellCount = 0;
	const totalCells = gridRows * gridCols;

	for (let y = 0; y < sourceCanvas.height; y += tesseraSize) {
		for (let x = 0; x < sourceCanvas.width; x += tesseraSize) {
			const gridY = Math.floor(y / tesseraSize);
			const gridX = Math.floor(x / tesseraSize);

			if (isCancelled) return resultCanvas;

			if (cellCount % Math.max(1, Math.floor(totalCells / 20)) === 0) {
				const progressPercent = 70 + Math.round((cellCount / totalCells) * 20);
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

	const blob = await canvas.convertToBlob({ type: "image/png" });
	return blobToDataUrl(blob);
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

	self.postMessage({
		type: "progress",
		percent: 90,
		message: "Creating final image...",
	});
	const blob = await resultCanvas.convertToBlob({ type: "image/png" });
	const dataUrl = await blobToDataUrl(blob);

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
