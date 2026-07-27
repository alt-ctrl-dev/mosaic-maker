/** Supported mosaic export formats. */
export type ExportFormat = "png" | "jpeg" | "webp";

/**
 * Create an HTML canvas element with the specified dimensions.
 *
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Load an image from a data URL.
 *
 * @param dataUrl - The data URL of the image to load
 * @returns A promise that resolves to the loaded image, or rejects on failure
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = dataUrl;
	});
}

/**
 * Export a mosaic to the specified format.
 * For JPEG exports, transparency is composited over a white background.
 *
 * @param mosaicDataUrl - The mosaic data URL to export
 * @param width - Mosaic width in pixels
 * @param height - Mosaic height in pixels
 * @param format - The desired output format
 * @param quality - Quality setting for JPEG/WebP (0.0 - 1.0), ignored for PNG
 * @param canvasCreator - Optional factory for creating canvas elements (for testing)
 * @param imageLoader - Optional image loading function (for testing)
 * @throws Error if the canvas context is unavailable or the format is unsupported
 */
export async function exportMosaic(
	mosaicDataUrl: string,
	width: number,
	height: number,
	format: ExportFormat,
	quality: number = 0.9,
	canvasCreator: (
		width: number,
		height: number,
	) => HTMLCanvasElement = createCanvas,
	imageLoader: (dataUrl: string) => Promise<HTMLImageElement> = loadImage,
): Promise<string> {
	const canvas = canvasCreator(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context for export");
	}

	const img = await imageLoader(mosaicDataUrl);

	ctx.drawImage(img, 0, 0, width, height);

	switch (format) {
		case "png":
			return canvas.toDataURL("image/png");

		case "jpeg":
			// For JPEG, composite transparency over white background
			ctx.globalCompositeOperation = "destination-over";
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, width, height);
			return canvas.toDataURL("image/jpeg", quality);

		case "webp":
			return canvas.toDataURL("image/webp", quality);

		default:
			throw new Error(`Unsupported export format: ${format}`);
	}
}
