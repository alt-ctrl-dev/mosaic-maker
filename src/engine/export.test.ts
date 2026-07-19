import { describe, expect, it, vi } from "vitest";
import { type ExportFormat, exportMosaic } from "./export";

// Create a simple mock canvas for testing
const mockCanvasContext = {
	drawImage: vi.fn(),
	fillStyle: "",
	fillRect: vi.fn(),
	globalCompositeOperation: "",
};

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = {
		width,
		height,
		getContext: vi.fn(() => mockCanvasContext),
		toDataURL: vi.fn((type?: string, _quality?: number) => {
			switch (type) {
				case "image/png":
					return "data:image/png;base64,mock-png-export";
				case "image/jpeg":
					return "data:image/jpeg;base64,mock-jpeg-export";
				case "image/webp":
					return "data:image/webp;base64,mock-webp-export";
				default:
					return "data:image/png;base64,mock-default-export";
			}
		}),
	} as unknown as HTMLCanvasElement;

	return canvas;
}

// Mock image for testing
const mockImage = {
	naturalWidth: 100,
	naturalHeight: 100,
} as HTMLImageElement;

describe("Export Engine", () => {
	const mosaicDataUrl = "data:image/png;base64,test-mosaic";

	const expectedResult: Record<ExportFormat, string> = {
		png: "data:image/png;base64,mock-png-export",
		jpeg: "data:image/jpeg;base64,mock-jpeg-export",
		webp: "data:image/webp;base64,mock-webp-export",
	};

	it.each([
		{ format: "png" as const, quality: 0.9 },
		{ format: "jpeg" as const, quality: 0.9 },
		{ format: "webp" as const, quality: 0.9 },
		{ format: "jpeg" as const, quality: 0.8 },
		{ format: "webp" as const, quality: 0.75 },
	])("should export $format at quality $quality", async ({
		format,
		quality,
	}) => {
		const mockCanvasCreator = vi.fn(createMockCanvas);
		const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

		const result = await exportMosaic(
			mosaicDataUrl,
			100,
			100,
			format,
			quality,
			mockCanvasCreator,
			mockImageLoader,
		);

		expect(result).toBe(expectedResult[format]);
		expect(mockCanvasCreator).toHaveBeenCalledWith(100, 100);
		expect(mockImageLoader).toHaveBeenCalledWith(mosaicDataUrl);
	});

	it("should ignore quality parameter for PNG exports", async () => {
		const mockCanvasCreator = vi.fn(createMockCanvas);
		const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

		const result = await exportMosaic(
			mosaicDataUrl,
			100,
			100,
			"png",
			0.5,
			mockCanvasCreator,
			mockImageLoader,
		);

		expect(result).toBe("data:image/png;base64,mock-png-export");
		expect(mockCanvasCreator).toHaveBeenCalledWith(100, 100);
		expect(mockImageLoader).toHaveBeenCalledWith(mosaicDataUrl);
	});

	it("should throw error for unsupported export format", async () => {
		const mockCanvasCreator = vi.fn(createMockCanvas);
		const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

		const callExport = () =>
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				// biome-ignore lint/suspicious/noExplicitAny: Intentionally bypassing type checking to test runtime error handling for unsupported formats
				"bmp" as any, // Intentionally bypassing type checking to test runtime error
				0.9,
				mockCanvasCreator,
				mockImageLoader,
			);

		await expect(callExport()).rejects.toThrow(
			"Unsupported export format: bmp",
		);
	});

	it("should handle image loading errors", async () => {
		const mockCanvasCreator = vi.fn(createMockCanvas);
		const mockImageLoader = vi
			.fn()
			.mockRejectedValue(new Error("Failed to load image"));

		await expect(
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				"png",
				0.9,
				mockCanvasCreator,
				mockImageLoader,
			),
		).rejects.toThrow("Failed to load image");
	});

	it("should handle canvas context errors", async () => {
		// Mock canvas that returns null context
		const mockCanvasWithNullContext = {
			width: 100,
			height: 100,
			getContext: vi.fn().mockReturnValue(null),
		} as unknown as HTMLCanvasElement;

		const mockCanvasCreator = vi.fn(() => mockCanvasWithNullContext);
		const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

		await expect(
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				"png",
				0.9,
				mockCanvasCreator,
				mockImageLoader,
			),
		).rejects.toThrow("Failed to get canvas context for export");
	});
});
