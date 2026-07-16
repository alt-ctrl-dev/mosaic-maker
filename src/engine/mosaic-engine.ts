import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

export interface MosaicResult {
	dataUrl: string;
	width: number;
	height: number;
	progress?: {
		percent: number;
		message: string;
	};
}

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
 *
 * @param width - Width of the mosaic
 * @param height - Height of the mosaic
 * @returns Data URL of a placeholder image
 */
function generatePlaceholderMosaic(width: number, height: number): string {
	// Create a simple placeholder canvas
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		// Fallback if canvas is not available
		return `data:image/png;base64,placeholder-error-canvas-context-unavailable`;
	}

	// Fill with a light gray background
	ctx.fillStyle = "#f0f0f0";
	ctx.fillRect(0, 0, width, height);

	// Add a simple pattern
	ctx.fillStyle = "#cccccc";
	for (let y = 0; y < height; y += 20) {
		const rowOffset = (y / 20) % 2 === 0 ? 0 : 10;
		for (let x = rowOffset; x < width; x += 20) {
			ctx.fillRect(x, y, 10, 10);
		}
	}

	return canvas.toDataURL("image/png");
}
