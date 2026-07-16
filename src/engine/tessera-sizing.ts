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
  // Minimum valid tessera size is 8 pixels
  const MIN_TESSERA_SIZE = 8;

  // Find all valid tessera sizes (divisors of both dimensions)
  const validSizes: number[] = [];

  // The maximum possible tessera size is the smaller of the two dimensions
  const maxSize = Math.min(sourceWidth, sourceHeight);

  // Check all possible sizes from minimum up to maximum
  for (let size = MIN_TESSERA_SIZE; size <= maxSize; size++) {
    if (sourceWidth % size === 0 && sourceHeight % size === 0) {
      validSizes.push(size);
    }
  }

  // If no valid sizes exist, return null
  if (validSizes.length === 0) {
    return null;
  }

  // Find the valid size closest to the requested size
  let bestSize = validSizes[0];
  let bestDistance = Math.abs(requestedSize - validSizes[0]);

  for (let i = 1; i < validSizes.length; i++) {
    const distance = Math.abs(requestedSize - validSizes[i]);
    // If this size is equally close, prefer the smaller size (tie-breaking)
    if (
      distance < bestDistance ||
      (distance === bestDistance && validSizes[i] < bestSize)
    ) {
      bestSize = validSizes[i];
      bestDistance = distance;
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
