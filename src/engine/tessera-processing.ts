import { getImageFileError, isSupportedImageFormat } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

/** Minimum recommended tessera size in pixels */
const MIN_RECOMMENDED_SIZE = 50;

/**
 * Process a collection of image files into tesserae.
 * Each file is validated, processed, and converted into a tessera
 * with appropriate metadata and preview.
 *
 * @param files - Array of image files to process
 * @param targetSize - The target size for each tessera
 * @returns A promise that resolves to an array of processed tesserae
 */
export async function processTesserae(
	files: File[],
	targetSize: number,
): Promise<TesseraInfo[]> {
	const tesserae: TesseraInfo[] = [];

	for (const file of files) {
		try {
			const tesseraInfo = await processSingleTessera(file, targetSize);
			tesserae.push(tesseraInfo);
		} catch (error) {
			tesserae.push({
				file,
				fileName: file.name,
				isValid: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
				isLowResolution: false,
				previewUrl: null,
			});
		}
	}

	return tesserae;
}

/**
 * Resize existing tesserae to a new target size.
 * Useful when the tessera size changes after tesserae have already been uploaded.
 *
 * @param tesserae - Array of existing tesserae to resize
 * @param targetSize - The new target size for each tessera
 * @returns A promise that resolves to an array of resized tesserae
 */
export async function resizeTesserae(
	tesserae: TesseraInfo[],
	targetSize: number,
): Promise<TesseraInfo[]> {
	const files = tesserae.map((t) => t.file);
	return processTesserae(files, targetSize);
}

/**
 * Process a single image file into a tessera.
 * Validates the file format, loads the image, crops it to a square,
 * resizes it to the target size, and generates a preview.
 *
 * @param file - The image file to process
 * @param targetSize - The target size for the tessera
 * @returns A promise that resolves to the processed tessera information
 */
async function processSingleTessera(
	file: File,
	targetSize: number,
): Promise<TesseraInfo> {
	if (!isSupportedImageFormat(file)) {
		return {
			file,
			fileName: file.name,
			isValid: false,
			error: getImageFileError(file),
			isLowResolution: false,
			previewUrl: null,
		};
	}

	const img = await loadImageFromFile(file);
	const croppedCanvas = centerCropToSquare(img);
	const isLowResolution =
		Math.min(croppedCanvas.width, croppedCanvas.height) < MIN_RECOMMENDED_SIZE;
	const resizedCanvas = resizeCanvas(croppedCanvas, targetSize, targetSize);
	const previewUrl = resizedCanvas.toDataURL("image/png");

	return {
		file,
		fileName: file.name,
		isValid: true,
		error: null,
		isLowResolution,
		previewUrl,
	};
}

/**
 * Load an image from a file.
 * Creates an Image object and loads the file data into it.
 *
 * @param file - The file to load as an image
 * @returns A promise that resolves to the loaded HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}

/**
 * Crop an image to a square by taking the center portion.
 *
 * @param img - The image to crop
 * @returns A canvas element containing the cropped square image
 */
function centerCropToSquare(img: HTMLImageElement): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	const size = Math.min(img.width, img.height);
	canvas.width = size;
	canvas.height = size;

	const x = (img.width - size) / 2;
	const y = (img.height - size) / 2;

	ctx.drawImage(img, x, y, size, size, 0, 0, size, size);

	return canvas;
}

/**
 * Resize a canvas to the specified dimensions.
 * Uses high-quality image smoothing for better results.
 *
 * @param canvas - The canvas to resize
 * @param width - The target width
 * @param height - The target height
 * @returns A new canvas with the resized image
 */
function resizeCanvas(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
): HTMLCanvasElement {
	const resizedCanvas = document.createElement("canvas");
	resizedCanvas.width = width;
	resizedCanvas.height = height;

	const ctx = resizedCanvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(canvas, 0, 0, width, height);

	return resizedCanvas;
}
