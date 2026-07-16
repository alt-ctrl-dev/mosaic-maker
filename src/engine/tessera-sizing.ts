/** Minimum tessera size in pixels. */
const MIN_TESSERA_SIZE = 8;

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

export function calculateGridCellCount(
	tesseraSize: number,
	sourceWidth: number,
	sourceHeight: number,
): number {
	const gridWidth = sourceWidth / tesseraSize;
	const gridHeight = sourceHeight / tesseraSize;
	return gridWidth * gridHeight;
}

export function isCoarseGrid(cellCount: number): boolean {
	return cellCount < 100;
}

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
