/**
 * Shared mosaic generation logic that can be used by both the main thread
 * and the web worker.
 */

/** Width and height of the spatial color grid used for matching. */
export const COLOR_GRID_SIZE = 3;

/** Alpha blending ratio for source image layer in the composite mosaic. */
export const BLEND_SOURCE_ALPHA = 0.25;

/** Tolerance multiplier for neighbor-avoidance: an alternative within this factor of the best match is preferred. */
export const ALTERNATIVE_TOLERANCE = 1.1;

export interface RGB {
	r: number;
	g: number;
	b: number;
}

/** Perceptually uniform OKLab color. */
export interface Oklab {
	L: number;
	a: number;
	b: number;
}

export interface ColorGrid {
	colors: Oklab[][];
}

/**
 * Apply sRGB gamma linearization.
 */
export function linearize(channel: number): number {
	return channel <= 0.04045
		? channel / 12.92
		: ((channel + 0.055) / 1.055) ** 2.4;
}

/**
 * Convert an sRGB color to OKLab.
 */
export function rgbToOklab(rgb: RGB): Oklab {
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
 * Euclidean distance between two OKLab colors (perceptually uniform).
 */
export function oklabDistance(a: Oklab, b: Oklab): number {
	const deltaL = a.L - b.L;
	const deltaA = a.a - b.a;
	const deltaB = a.b - b.b;
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Average perceptual distance between two color grids.
 */
export function averageGridDistance(
	grid1: ColorGrid,
	grid2: ColorGrid,
): number {
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
 * Choose the best tessera for a cell, preferring the closest color match but
 * avoiding the tesserae used directly above and to the left when an alternative
 * is within {@link ALTERNATIVE_TOLERANCE} of the best score.
 */
export function selectTessera<T>(
	cellGrid: ColorGrid,
	processedTesserae: T[],
	colorGridExtractor: (tessera: T) => ColorGrid,
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
			colorGridExtractor(processedTesserae[i]),
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
