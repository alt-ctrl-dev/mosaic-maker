/**
 * Image format types supported for export
 */
export type ExportFormat = "png" | "jpeg" | "webp";

/**
 * Internal function to create a canvas for testing purposes
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Load an image from a data URL
 *
 * @param dataUrl - The data URL of the image to load
 * @returns Promise resolving to the loaded HTMLImageElement
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
 * Export a mosaic to a specific format with optional quality settings.
 *
 * @param mosaicDataUrl - The data URL of the generated mosaic
 * @param width - Width of the mosaic in pixels
 * @param height - Height of the mosaic in pixels
 * @param format - Target format for export
 * @param quality - Quality setting for JPEG/WebP (0.0 - 1.0), ignored for PNG
 * @param canvasCreator - Optional function to create canvas (for testing)
 * @param imageLoader - Optional function to load images (for testing)
 * @returns Promise resolving to the exported image as a data URL
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
	// Create an off-screen canvas for export
	const canvas = canvasCreator(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context for export");
	}

	// Load the mosaic image
	const img = await imageLoader(mosaicDataUrl);

	// Draw the image on the canvas
	ctx.drawImage(img, 0, 0, width, height);

	// Export based on format
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
			// Check if WebP is supported
			try {
				return canvas.toDataURL("image/webp", quality);
			} catch {
				// Fallback to PNG if WebP is not supported
				return canvas.toDataURL("image/png");
			}

		default:
			throw new Error(`Unsupported export format: ${format}`);
	}
}
