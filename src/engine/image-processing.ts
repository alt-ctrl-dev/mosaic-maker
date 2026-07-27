/**
 * Check if the provided file is a supported image format.
 * Supported formats are JPEG, PNG, and WebP.
 *
 * @param file - The file to check
 * @returns True if the file is a supported image format, false otherwise
 */
export function isSupportedImageFormat(file: File): boolean {
	const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
	return supportedTypes.includes(file.type);
}

/**
 * Get an appropriate error message for an image file.
 * Provides specific error messages for different failure cases.
 *
 * @param file - The file to generate an error message for
 * @returns An error message describing why the file is invalid
 */
export function getImageFileError(file: File): string {
	if (!file.type) {
		return "File type could not be determined. The file may be corrupted or invalid.";
	}

	if (!isSupportedImageFormat(file)) {
		return `Unsupported file type: ${file.type}. Please select a JPEG, PNG, or WebP image.`;
	}

	return "The image file could not be processed. It may be corrupted or invalid.";
}

/**
 * Information about a source image.
 */
export interface SourceImageInfo {
	/** The natural width of the image in pixels */
	width: number;
	/** The natural height of the image in pixels */
	height: number;
	/** The orientation of the image as decoded from EXIF data */
	orientation: number;
}

/**
 * Extract information about a source image from a file.
 * Gets the natural width and height of the image, and would
 * extract EXIF orientation in a full implementation.
 *
 * @param file - The image file to process
 * @returns A promise that resolves to the source image information
 */
export async function getSourceImageInfo(file: File): Promise<SourceImageInfo> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				orientation: 1, // In a real implementation, we'd extract actual EXIF orientation
			});
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}
