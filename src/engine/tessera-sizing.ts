/** Minimum tessera size in pixels. */
const MIN_TESSERA_SIZE = 8;

/**
 * Calculate the adjusted tessera size that best fits the source image dimensions.
 * With partial edge cells, any size from {@link MIN_TESSERA_SIZE} to the minimum dimension is valid.
 * The requested size is clamped to this valid range.
 *
 * @param requestedSize - The tessera size requested by the user
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns The adjusted tessera size clamped to the valid range
 */
export function calculateAdjustedTesseraSize(
	requestedSize: number,
	sourceWidth: number,
	sourceHeight: number,
): number {
	const maxSize = Math.min(sourceWidth, sourceHeight);

	// Clamp the requested size to the valid range
	return Math.max(MIN_TESSERA_SIZE, Math.min(requestedSize, maxSize));
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
	const gridWidth = Math.ceil(sourceWidth / tesseraSize);
	const gridHeight = Math.ceil(sourceHeight / tesseraSize);
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
 * With partial edge cells, a valid tessera size is any size from {@link MIN_TESSERA_SIZE}
 * up to the minimum dimension. So the image is valid as long as both dimensions are
 * at least {@link MIN_TESSERA_SIZE}.
 *
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns True if the source image dimensions are both at least {@link MIN_TESSERA_SIZE}, false otherwise
 */
export function hasValidTesseraSizes(
	sourceWidth: number,
	sourceHeight: number,
): boolean {
	return sourceWidth >= MIN_TESSERA_SIZE && sourceHeight >= MIN_TESSERA_SIZE;
}
