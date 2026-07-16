/** Minimum tessera size in pixels. */
const MIN_TESSERA_SIZE = 8;

/**
 * Calculate the nearest valid tessera size that divides both source dimensions evenly.
 * If there's a tie between two equally close valid sizes, choose the smaller one.
 *
 * @param requestedSize - The tessera size requested by the user
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns The adjusted tessera size or null if no valid size exists above the minimum
 */
export function calculateAdjustedTesseraSize(
  requestedSize: number,
  sourceWidth: number,
  sourceHeight: number
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
 * Calculate the number of grid cells that would be created with the given tessera size.
 *
 * @param tesseraSize - The adjusted tessera size
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns The total number of grid cells
 */
export function calculateGridCellCount(
  tesseraSize: number,
  sourceWidth: number,
  sourceHeight: number
): number {
  const gridWidth = sourceWidth / tesseraSize;
  const gridHeight = sourceHeight / tesseraSize;
  return gridWidth * gridHeight;
}

/**
 * Check if the grid would be considered coarse (fewer than 100 cells).
 *
 * @param cellCount - The number of grid cells
 * @returns True if the grid is considered coarse
 */
export function isCoarseGrid(cellCount: number): boolean {
  return cellCount < 100;
}

/**
 * Check if a source image has any valid tessera sizes (divisors of both dimensions that are >= 8).
 *
 * @param sourceWidth - The width of the source image in pixels
 * @param sourceHeight - The height of the source image in pixels
 * @returns True if there are valid tessera sizes, false otherwise
 */
export function hasValidTesseraSizes(
  sourceWidth: number,
  sourceHeight: number
): boolean {
  const maxSize = Math.min(sourceWidth, sourceHeight);

  for (let size = MIN_TESSERA_SIZE; size <= maxSize; size++) {
    if (sourceWidth % size === 0 && sourceHeight % size === 0) {
      return true;
    }
  }

  return false;
}
