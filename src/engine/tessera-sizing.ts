/** Minimum tessera size in pixels. */
const MIN_TESSERA_SIZE = 8;

/**
 * Calculates the adjusted tessera size that divides both source dimensions evenly.
 *
 * @param requestedSize - The tessera size requested by the user
 * @param sourceWidth - The width of the source image
 * @param sourceHeight - The height of the source image
 * @returns The adjusted tessera size that divides both dimensions, or null if no valid size exists
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
 * Calculates the total number of grid cells for a given tessera size.
 *
 * @param tesseraSize - The size of each tessera
 * @param sourceWidth - The width of the source image
 * @param sourceHeight - The height of the source image
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
 * Determines if a grid is considered coarse based on cell count.
 *
 * @param cellCount - The number of cells in the grid
 * @returns True if the grid has fewer than 100 cells, false otherwise
 */
export function isCoarseGrid(cellCount: number): boolean {
	return cellCount < 100;
}

/**
 * Checks if there are valid tessera sizes for the given source dimensions.
 *
 * @param sourceWidth - The width of the source image
 * @param sourceHeight - The height of the source image
 * @returns True if valid tessera sizes exist, false otherwise
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
