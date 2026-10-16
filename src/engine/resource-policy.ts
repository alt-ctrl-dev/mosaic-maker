/**
 * Resource policy limits for image imports to prevent excessive memory consumption.
 */

/** Maximum file size for individual source images and tesserae (25 MiB) */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Maximum total retained file size across source image and tesserae (250 MiB) */
export const MAX_TOTAL_RETAINED_BYTES = 250 * 1024 * 1024;

/** Maximum number of tessera files that can be imported (500 files) */
export const MAX_TESSERA_FILES = 500;

/** Maximum decoded pixels per image (40 million pixels) */
export const MAX_DECODED_PIXELS = 40_000_000;

/** Maximum pixels on either axis (16,384 pixels) */
export const MAX_AXIS_PIXELS = 16_384;

/**
 * Check if a file exceeds the maximum allowed file size.
 *
 * @param file - The file to check
 * @returns True if the file exceeds the size limit, false otherwise
 */
export function isFileSizeExceeded(file: File): boolean {
	return file.size > MAX_FILE_SIZE_BYTES;
}

/**
 * Check if the total retained file size would exceed the limit.
 *
 * @param currentFiles - Array of currently retained files
 * @param newFiles - Array of new files to be added
 * @returns True if the total size would exceed the limit, false otherwise
 */
export function isTotalRetainedSizeExceeded(
	currentFiles: (File | undefined)[],
	newFiles: File[],
): boolean {
	const currentSize = currentFiles.reduce(
		(sum, file) => sum + (file?.size ?? 0),
		0,
	);
	const newSize = newFiles.reduce((sum, file) => sum + file.size, 0);
	return currentSize + newSize > MAX_TOTAL_RETAINED_BYTES;
}

/**
 * Check if the number of tessera files exceeds the limit.
 *
 * @param currentCount - Current number of tessera files
 * @param newCount - Number of new files to be added
 * @returns True if the total count would exceed the limit, false otherwise
 */
export function isTesseraFileLimitExceeded(
	currentCount: number,
	newCount: number,
): boolean {
	return currentCount + newCount > MAX_TESSERA_FILES;
}

/**
 * Check if image dimensions exceed the maximum allowed pixels.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns True if dimensions exceed limits, false otherwise
 */
export function isDimensionLimitExceeded(
	width: number,
	height: number,
): boolean {
	return (
		width > MAX_AXIS_PIXELS ||
		height > MAX_AXIS_PIXELS ||
		width * height > MAX_DECODED_PIXELS
	);
}

/**
 * Load an image file and return its decoded dimensions.
 *
 * This reads only the image header (without allocating a canvas) and is
 * suitable for pre-screening files before the full processing pipeline.
 *
 * @param file - The image file to decode
 * @returns The image's natural width and height in pixels
 * @throws {Error} If the file cannot be decoded as an image
 */
export async function getImageDimensions(
	file: File,
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(`Failed to decode image: ${file.name}`));
		};

		img.src = url;
	});
}

/**
 * Get an appropriate error message for file size violations.
 *
 * @param fileName - Name of the file that exceeded limits
 * @returns Error message describing the size violation
 */
export function getFileSizeErrorMessage(fileName: string): string {
	return `File "${fileName}" is too large (${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(1)} MiB maximum). Please select a smaller file.`;
}

/**
 * Get an appropriate error message for total retained size violations.
 *
 * @returns Error message describing the total size violation
 */
export function getTotalSizeErrorMessage(): string {
	return `Total imported files would exceed ${(MAX_TOTAL_RETAINED_BYTES / (1024 * 1024)).toFixed(1)} MiB. Please remove some files or use smaller images.`;
}

/**
 * Get an appropriate error message for tile file count violations.
 *
 * @returns Error message describing the file count violation
 */
export function getFileCountErrorMessage(): string {
	return `Too many tiles imported (${MAX_TESSERA_FILES} maximum). Please remove some files.`;
}

/**
 * Get an appropriate error message for dimension violations.
 *
 * @param width - Image width that exceeded limits
 * @param height - Image height that exceeded limits
 * @returns Error message describing the dimension violation
 */
export function getDimensionErrorMessage(
	width: number,
	height: number,
): string {
	if (width > MAX_AXIS_PIXELS || height > MAX_AXIS_PIXELS) {
		return `Image dimensions too large (${MAX_AXIS_PIXELS} pixels maximum on either axis).`;
	}
	return `Image contains too many pixels (${MAX_DECODED_PIXELS.toLocaleString()} maximum).`;
}
