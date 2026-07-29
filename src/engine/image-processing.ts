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
 * Extract EXIF orientation from JPEG image data.
 *
 * @param arrayBuffer - Raw bytes of the image file
 * @returns The raw EXIF orientation value, or null if not present or unparseable
 */
export function extractEXIFOrientation(
	arrayBuffer: ArrayBuffer,
): number | null {
	try {
		const dataView = new DataView(arrayBuffer);

		if (dataView.byteLength < 2 || dataView.getUint16(0, false) !== 0xffd8) {
			return null;
		}

		const length = dataView.byteLength;
		let offset = 2;

		while (offset < length) {
			if (offset + 2 > length) {
				break;
			}

			if (dataView.getUint16(offset, false) === 0xffe1) {
				if (offset + 4 > length) {
					break;
				}

				const exifDataStart = offset + 10; // Skip APP1 marker, length, and "Exif\0\0" identifier

				if (
					exifDataStart + 8 <= length &&
					dataView.getUint32(exifDataStart, false) === 0x45786966
				) {
					const tiffOffset = exifDataStart + 6;

					if (tiffOffset + 8 > length) {
						break;
					}

					const isBigEndian = dataView.getUint16(tiffOffset, false) === 0x4d4d;
					const readUint16 = isBigEndian
						? (pos: number) => dataView.getUint16(pos, false)
						: (pos: number) => dataView.getUint16(pos, true);
					const readUint32 = isBigEndian
						? (pos: number) => dataView.getUint32(pos, false)
						: (pos: number) => dataView.getUint32(pos, true);

					if (tiffOffset + 8 > length) {
						break;
					}

					const ifdOffset = readUint32(tiffOffset + 4);
					const ifdStart = tiffOffset + ifdOffset;

					if (ifdStart + 2 > length) {
						break;
					}

					const tagCount = readUint16(ifdStart);
					const ORIENTATION_TAG = 0x0112;
					const EXIF_FORMAT_SHORT = 3;

					for (let i = 0; i < tagCount; i++) {
						const tagOffset = ifdStart + 2 + i * 12;

						if (tagOffset + 12 > length) {
							break;
						}

						if (readUint16(tagOffset) === ORIENTATION_TAG) {
							const format = readUint16(tagOffset + 2);
							const components = readUint32(tagOffset + 4);

							if (format === EXIF_FORMAT_SHORT && components === 1) {
								return readUint16(tagOffset + 8);
							}
						}
					}
				}
				break;
			}

			if (offset + 4 > length) {
				break;
			}
			const segmentLength = dataView.getUint16(offset + 2, false);

			if (segmentLength < 2 || segmentLength > 65535) {
				break;
			}

			offset += 2 + segmentLength;
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
	let orientation = 1;

	if (file.type === "image/jpeg") {
		try {
			const arrayBuffer = await file.arrayBuffer();
			const exifOrientation = extractEXIFOrientation(arrayBuffer);
			if (exifOrientation !== null) {
				orientation = exifOrientation;
			}
		} catch {
			// Failed to read or parse EXIF; keep default orientation
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
