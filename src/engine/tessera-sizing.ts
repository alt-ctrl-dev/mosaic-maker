/** Minimum tessera size in pixels. */
const MIN_TESSERA_SIZE = 2;

/**
 * Calculate the adjusted tessera size that best fits the source image dimensions.
 * Finds the valid tessera size (one that divides both width and height evenly)
 * that is closest to the requested size. In case of a tie, the smaller size is chosen.
 *
 * @param requestedSize - The tessera size requested by the user
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns The adjusted tessera size that fits the image dimensions, or null if none found
 */
export function calculateAdjustedTesseraSize(
	requestedSize: number,
	sourceWidth: number,
	sourceHeight: number,
): number | null {
	const maxSize = Math.min(sourceWidth, sourceHeight);

	let bestSize: number | null = null;
	let bestDistance = Infinity;

	for (let size = MIN_TESSERA_SIZE; size <= maxSize; size++) {
		if (sourceWidth % size === 0 && sourceHeight % size === 0) {
			const distance = Math.abs(requestedSize - size);
			if (
				distance < bestDistance ||
				(distance === bestDistance && size < (bestSize || Infinity))
			) {
				bestSize = size;
				bestDistance = distance;
			}
		}
	}

	return bestSize;
}

/**
 * Calculate the total number of grid cells in the mosaic.
 *
 * @param tesseraSize - The size of each tessera in pixels
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns The total number of grid cells
 */
export function calculateGridCellCount(
	tesseraSize: number,
	sourceWidth: number,
	sourceHeight: number,
): number {
	const gridWidth = sourceWidth / tesseraSize;
	const gridHeight = sourceHeight / tesseraSize;
	return gridWidth * gridHeight;
}

/**
 * Determine if a grid is considered "coarse" based on cell count.
 * A grid is considered coarse if it has fewer than 100 cells.
 *
 * @param cellCount - The number of cells in the grid
 * @returns True if the grid is coarse, false otherwise
 */
export function isCoarseGrid(cellCount: number): boolean {
	return cellCount < 100;
}

/**
 * Check if the source image has any valid tessera sizes.
 * A valid tessera size must be at least {@link MIN_TESSERA_SIZE}
 * and must divide both the width and height of the image evenly.
 *
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns True if at least one valid tessera size exists, false otherwise
 */
export function hasValidTesseraSizes(
	sourceWidth: number,
	sourceHeight: number,
): boolean {
	const maxSize = Math.min(sourceWidth, sourceHeight);

	for (let size = MIN_TESSERA_SIZE; size <= maxSize; size++) {
		if (sourceWidth % size === 0 && sourceHeight % size === 0) {
			return true;
		}
	}

	return false;
}
