import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

/**
 * Result of a mosaic generation operation.
 *
 * The {@link progress} field is optionally populated during async generation
 * to report incremental status to the caller.
 */
export interface MosaicResult {
	/** The mosaic image as a PNG data URL */
	dataUrl: string;
	/** Width of the mosaic in pixels */
	width: number;
	/** Height of the mosaic in pixels */
	height: number;
	/** Incremental generation progress, set when available */
	progress?: {
		percent: number;
		message: string;
	};
}

/**
 * Generate a mosaic from a source image and a collection of tesserae.
<<<<<<< HEAD
 *
 * Invalid tesserae are filtered out. When no valid tesserae remain, a
 * placeholder mosaic is returned instead of throwing.
 *
 * @throws {Error} if {@link tesseraSize} is not positive or the source image
 *   dimensions are not positive.
=======
 * If no valid tesserae are provided, generates a placeholder mosaic.
 *
 * @param sourceImage - Information about the source image
 * @param tesserae - Array of tesserae to use in the mosaic
 * @param tesseraSize - The size of each tessera in pixels
 * @returns A promise that resolves to the generated mosaic result
 * @throws Error if tessera size is not positive or source dimensions are not positive
>>>>>>> fc7655b (docs: add JSDoc comments to all functions)
 */
export async function generateMosaic(
	sourceImage: SourceImageInfo,
	tesserae: TesseraInfo[],
	tesseraSize: number,
): Promise<MosaicResult> {
	if (tesseraSize <= 0) {
		throw new Error("Tessera size must be positive");
	}

	if (sourceImage.width <= 0 || sourceImage.height <= 0) {
		throw new Error("Source image dimensions must be positive");
	}

	const validTesserae = tesserae.filter((t) => t.isValid);

	if (validTesserae.length === 0) {
		return {
			dataUrl: generatePlaceholderMosaic(sourceImage.width, sourceImage.height),
			width: sourceImage.width,
			height: sourceImage.height,
		};
	}

	return {
		dataUrl: `data:image/png;base64,placeholder-${validTesserae.length}-valid-tesserae`,
		width: sourceImage.width,
		height: sourceImage.height,
	};
}

/**
 * Generate a placeholder mosaic for cases where no valid tesserae exist.
 * Creates a simple pattern on a light gray background.
 *
 * @param width - Width of the mosaic
 * @param height - Height of the mosaic
 * @returns Data URL of a placeholder image
 */
function generatePlaceholderMosaic(width: number, height: number): string {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return `data:image/png;base64,placeholder-error-canvas-context-unavailable`;
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

	return canvas.toDataURL("image/png");
}
