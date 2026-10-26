import {
	COLOR_GRID_SIZE,
	type ColorGrid,
	type Oklab,
	rgbToOklab,
} from "./mosaic-shared";

/** Floats per packed color grid: 3×3 cells × (L, a, b). */
export const PACKED_GRID_LENGTH = COLOR_GRID_SIZE * COLOR_GRID_SIZE * 3;

/** A horizontal strip of whole grid rows handed to one sampler worker. */
export interface SourceBand {
	/** Top edge in source pixels. */
	y: number;
	/** Height in source pixels, clipped to the image so edge cells sample as before. */
	height: number;
	/** Grid rows covered by this band. */
	rows: number;
}

/** Split the source into at most `count` bands of whole grid rows. */
export function splitIntoBands(
	sourceHeight: number,
	tesseraSize: number,
	count: number,
): SourceBand[] {
	const gridRows = Math.ceil(sourceHeight / tesseraSize);
	const rowsPerBand = Math.ceil(gridRows / Math.max(1, count));
	const bands: SourceBand[] = [];
	for (let row = 0; row < gridRows; row += rowsPerBand) {
		const rows = Math.min(rowsPerBand, gridRows - row);
		const y = row * tesseraSize;
		bands.push({
			y,
			height: Math.min(rows * tesseraSize, sourceHeight - y),
			rows,
		});
	}
	return bands;
}

/** Downsample a region of an image to a 3×3 OKLab color grid. */
export function sampleColorGrid(
	source: CanvasImageSource,
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
		const ctx = new OffscreenCanvas(
			COLOR_GRID_SIZE,
			COLOR_GRID_SIZE,
		).getContext("2d");
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

	const { data } = tempCtx.getImageData(0, 0, COLOR_GRID_SIZE, COLOR_GRID_SIZE);

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

/**
 * Sample every cell of an image, row-major, into one flat buffer so it can be
 * transferred between workers without cloning thousands of objects.
 */
export function sampleCellGrids(
	source: CanvasImageSource & { width: number; height: number },
	tesseraSize: number,
): Float64Array {
	const ctx = new OffscreenCanvas(COLOR_GRID_SIZE, COLOR_GRID_SIZE).getContext(
		"2d",
	);
	if (!ctx) {
		throw new Error("Failed to get temporary canvas context");
	}

	const cols = Math.ceil(source.width / tesseraSize);
	const rows = Math.ceil(source.height / tesseraSize);
	const packed = new Float64Array(cols * rows * PACKED_GRID_LENGTH);
	let offset = 0;
	for (let y = 0; y < source.height; y += tesseraSize) {
		for (let x = 0; x < source.width; x += tesseraSize) {
			const grid = sampleColorGrid(source, x, y, tesseraSize, tesseraSize, ctx);
			for (const row of grid.colors) {
				for (const color of row) {
					packed[offset++] = color.L;
					packed[offset++] = color.a;
					packed[offset++] = color.b;
				}
			}
		}
	}
	return packed;
}

/** Read the color grid of cell `index` back out of a packed buffer. */
export function unpackColorGrid(
	packed: Float64Array,
	index: number,
): ColorGrid {
	let offset = index * PACKED_GRID_LENGTH;
	const colors: Oklab[][] = [];
	for (let rowIndex = 0; rowIndex < COLOR_GRID_SIZE; rowIndex++) {
		const row: Oklab[] = [];
		for (let colIndex = 0; colIndex < COLOR_GRID_SIZE; colIndex++) {
			row.push({
				L: packed[offset],
				a: packed[offset + 1],
				b: packed[offset + 2],
			});
			offset += 3;
		}
		colors.push(row);
	}
	return { colors };
}
