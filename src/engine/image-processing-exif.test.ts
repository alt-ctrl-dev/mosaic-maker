import { describe, expect, it } from "vitest";
import { extractEXIFOrientation } from "./image-processing";

describe("extractEXIFOrientation", () => {
	it("returns null for non-JPEG files", () => {
		// Create a simple non-JPEG buffer (PNG signature)
		const pngData = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		const arrayBuffer = pngData.buffer.slice(
			pngData.byteOffset,
			pngData.byteOffset + pngData.byteLength,
		);

		const orientation = extractEXIFOrientation(arrayBuffer);
		expect(orientation).toBeNull();
	});

	it("returns null for JPEG files without EXIF", () => {
		// Create a minimal JPEG without EXIF
		const jpegData = new Uint8Array([
			0xff,
			0xd8, // SOI
			0xff,
			0xc0, // SOF0
			0x00,
			0x11, // Length
			0x08, // Bits per component
			0x00,
			0x01, // Height = 1
			0x00,
			0x01, // Width = 1
			0x01, // Number of components
			0x01, // Component 1 ID
			0x22, // Component 1 sampling factor
			0x00, // Component 1 quantization table
			0xff,
			0xd9, // EOI
		]);
		const arrayBuffer = jpegData.buffer.slice(
			jpegData.byteOffset,
			jpegData.byteOffset + jpegData.byteLength,
		);

		const orientation = extractEXIFOrientation(arrayBuffer);
		expect(orientation).toBeNull();
	});

	it("handles incomplete EXIF data without crashing", () => {
		const jpegData = new Uint8Array([
			0xff,
			0xd8, // SOI
			0xff,
			0xe1, // APP1 marker
			0x00,
			0x10, // Length
			0x45,
			0x78,
			0x69,
			0x66,
			0x00,
			0x00, // "Exif\0\0"
			0x49,
			0x49,
			0x2a,
			0x00, // TIFF header
		]);
		const arrayBuffer = jpegData.buffer.slice(
			jpegData.byteOffset,
			jpegData.byteOffset + jpegData.byteLength,
		);

		const orientation = extractEXIFOrientation(arrayBuffer);
		expect(orientation).toBeNull();
	});
});
