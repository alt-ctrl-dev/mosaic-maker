import type { TesseraInfo } from "./workflow-state";
import { isSupportedImageFormat, getImageFileError } from "./image-processing";

/** Minimum recommended tessera size in pixels */
const MIN_RECOMMENDED_SIZE = 50;

/**
 * Process a collection of tessera files into TesseraInfo objects.
 *
 * @param files - The tessera files to process
 * @param targetSize - The target size for the tesserae
 * @returns A promise that resolves with an array of processed tessera information
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
