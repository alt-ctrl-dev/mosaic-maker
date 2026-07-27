import { describe, expect, it, vi } from "vitest";
import { type ExportFormat, exportMosaic } from "./export";

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

const mockImage = {
	naturalWidth: 100,
	naturalHeight: 100,
} as HTMLImageElement;

function setupStandardMocks() {
	return {
		canvasCreator:
			vi.fn<(width: number, height: number) => HTMLCanvasElement>(
				createMockCanvas,
			),
		imageLoader: vi
			.fn<(dataUrl: string) => Promise<HTMLImageElement>>()
			.mockResolvedValue(mockImage),
	};
}

const expectedMimeTypes: Record<ExportFormat, string> = {
	png: "data:image/png;base64,mock-png-export",
	jpeg: "data:image/jpeg;base64,mock-jpeg-export",
	webp: "data:image/webp;base64,mock-webp-export",
};

describe("Export Engine", () => {
	const mosaicDataUrl = "data:image/png;base64,test-mosaic";

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
		const { canvasCreator, imageLoader } = setupStandardMocks();

		const result = await exportMosaic(
			mosaicDataUrl,
			100,
			100,
			format,
			quality,
			canvasCreator,
			imageLoader,
		);

		expect(result).toBe(expectedMimeTypes[format]);
		expect(canvasCreator).toHaveBeenCalledWith(100, 100);
		expect(imageLoader).toHaveBeenCalledWith(mosaicDataUrl);
	});

	it("should ignore quality parameter for PNG exports", async () => {
		const { canvasCreator, imageLoader } = setupStandardMocks();

		const result = await exportMosaic(
			mosaicDataUrl,
			100,
			100,
			"png",
			0.5,
			canvasCreator,
			imageLoader,
		);

		expect(result).toBe("data:image/png;base64,mock-png-export");
		expect(canvasCreator).toHaveBeenCalledWith(100, 100);
		expect(imageLoader).toHaveBeenCalledWith(mosaicDataUrl);
	});

	it("should throw error for unsupported export format", async () => {
		const { canvasCreator, imageLoader } = setupStandardMocks();

		const callExport = () =>
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				// biome-ignore lint/suspicious/noExplicitAny: intentionally bypassing type checking to test runtime error handling for unsupported formats
				"bmp" as any,
				0.9,
				canvasCreator,
				imageLoader,
			);

		await expect(callExport()).rejects.toThrow(
			"Unsupported export format: bmp",
		);
	});

	it("should handle image loading errors", async () => {
		const { canvasCreator } = setupStandardMocks();
		const imageLoader = vi
			.fn()
			.mockRejectedValue(new Error("Failed to load image"));

		await expect(
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				"png",
				0.9,
				canvasCreator,
				imageLoader,
			),
		).rejects.toThrow("Failed to load image");
	});

	it("should handle canvas context errors", async () => {
		const mockCanvasWithNullContext = {
			width: 100,
			height: 100,
			getContext: vi.fn().mockReturnValue(null),
		} as unknown as HTMLCanvasElement;

		const canvasCreator = vi.fn(() => mockCanvasWithNullContext);
		const imageLoader = vi.fn().mockResolvedValue(mockImage);

		await expect(
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				"png",
				0.9,
				canvasCreator,
				imageLoader,
			),
		).rejects.toThrow("Failed to get canvas context for export");
	});

	it("should throw error when WebP is not supported", async () => {
		const mockCanvasThatThrowsForWebP = {
			width: 100,
			height: 100,
			getContext: vi.fn(() => mockCanvasContext),
			toDataURL: vi.fn((type?: string, _quality?: number) => {
				if (type === "image/webp") {
					throw new Error("WebP not supported");
				}
				return `data:${type || "image/png"};base64,mock-export`;
			}),
		} as unknown as HTMLCanvasElement;

		const canvasCreator = vi.fn(() => mockCanvasThatThrowsForWebP);
		const imageLoader = vi.fn().mockResolvedValue(mockImage);

		await expect(
			exportMosaic(
				mosaicDataUrl,
				100,
				100,
				"webp",
				0.9,
				canvasCreator,
				imageLoader,
			),
		).rejects.toThrow("WebP not supported");
	});
});
