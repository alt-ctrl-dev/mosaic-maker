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
 * Extract EXIF orientation from JPEG image data
 *
 * @param arrayBuffer - The image data as ArrayBuffer
 * @returns The orientation value (1-8) or null if not found
 */
export function extractEXIFOrientation(
	arrayBuffer: ArrayBuffer,
): number | null {
	try {
		const dataView = new DataView(arrayBuffer);

		// Check if it's a JPEG file
		if (dataView.byteLength < 2 || dataView.getUint16(0, false) !== 0xffd8) {
			return null; // Not a JPEG file or too small
		}

		const length = dataView.byteLength;
		let offset = 2;

		while (offset < length) {
			// Check bounds before reading
			if (offset + 2 > length) {
				break;
			}

			// Check for EXIF APP1 marker
			if (dataView.getUint16(offset, false) === 0xffe1) {
				// Found EXIF marker
				// Check bounds for full APP1 segment
				if (offset + 4 > length) {
					break;
				}

				const _segmentLength = dataView.getUint16(offset + 2, false);
				const exifDataStart = offset + 10; // Skip APP1 marker and length + "Exif\0\0"

				// Check for TIFF header with bounds checking
				if (
					exifDataStart + 8 <= length &&
					dataView.getUint32(exifDataStart, false) === 0x45786966
				) {
					const tiffOffset = exifDataStart + 6;

					// Bounds check for TIFF header
					if (tiffOffset + 8 > length) {
						break;
					}

					const isBigEndian = dataView.getUint16(tiffOffset, false) === 0x4d4d;
					const getUint16 = isBigEndian
						? (offset: number) => dataView.getUint16(offset, false)
						: (offset: number) => dataView.getUint16(offset, true);
					const getUint32 = isBigEndian
						? (offset: number) => dataView.getUint32(offset, false)
						: (offset: number) => dataView.getUint32(offset, true);

					// Bounds check for IFD0 offset
					if (tiffOffset + 8 > length) {
						break;
					}

					const ifdOffset = getUint32(tiffOffset + 4);
					const ifdStart = tiffOffset + ifdOffset;

					// Bounds check for tag count
					if (ifdStart + 2 > length) {
						break;
					}

					const tagCount = getUint16(ifdStart);

					// Search for Orientation tag (0x0112)
					for (let i = 0; i < tagCount; i++) {
						const tagOffset = ifdStart + 2 + i * 12;

						// Bounds check for tag
						if (tagOffset + 12 > length) {
							break;
						}

						const tag = getUint16(tagOffset);

						if (tag === 0x0112) {
							// Orientation tag
							const format = getUint16(tagOffset + 2);
							const components = getUint32(tagOffset + 4);

							if (format === 3 && components === 1) {
								// Short format, single value
								const valueOffset = tagOffset + 8;
								const value = getUint16(valueOffset);
								return value;
							}
						}
					}
				}
				break;
			}

			// Move to next marker with bounds checking
			if (offset + 4 > length) {
				break;
			}
			const _segmentLength = dataView.getUint16(offset + 2, false);

			// Safety check to prevent infinite loop
			if (_segmentLength < 2 || _segmentLength > 65535) {
				break;
			}

			offset += 2 + _segmentLength;
		}

		return null;
	} catch (_error) {
		return null;
	}
}

/**
 * Extract information about a source image from a file.
 * Gets the natural width and height of the image, and extracts
 * EXIF orientation if available.
 *
 * @param file - The image file to process
 * @returns A promise that resolves to the source image information
 */
export async function getSourceImageInfo(file: File): Promise<SourceImageInfo> {
	// For JPEG files, we need to extract EXIF orientation
	// For PNG/WebP files, orientation is always 1

	let orientation = 1;

	// Only attempt EXIF parsing for JPEG files
	if (file.type === "image/jpeg") {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const exifOrientation = extractEXIFOrientation(arrayBuffer);
			if (exifOrientation !== null) {
				orientation = exifOrientation;
			}
		} catch (_error) {
			// If EXIF parsing fails, default to orientation 1
			orientation = 1;
		}
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				orientation: orientation,
			});
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
}
