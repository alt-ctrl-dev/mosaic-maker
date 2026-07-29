import { describe, expect, it, vi } from "vitest";
import type { SourceImageInfo } from "./image-processing";
import { generateMosaic } from "./mosaic-engine";
import type { TesseraInfo } from "./workflow-state";

function makeTessera(overrides: Partial<TesseraInfo> = {}): TesseraInfo {
	return {
		file: new File([], "test.jpg", { type: "image/jpeg" }),
		fileName: "test.jpg",
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: "data:image/png;base64,test",
		...overrides,
	};
}

const mockCanvasContext = {
	drawImage: vi.fn(),
	fillStyle: "",
	fillRect: vi.fn(),
	globalCompositeOperation: "",
	globalAlpha: 1,
	createLinearGradient: vi.fn(() => ({
		addColorStop: vi.fn(),
	})),
	getImageData: vi.fn(() => ({
		data: new Array(36)
			.fill(0)
			.map((_, i) => (i % 4 === 3 ? 255 : Math.floor(i / 4) % 256)), // RGBA data
	})),
	clearRect: vi.fn(),
};

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = {
		width,
		height,
		getContext: vi.fn(() => mockCanvasContext),
		toDataURL: vi.fn(
			() => `data:image/png;base64,mock-mosaic-${width}x${height}`,
		),
	} as unknown as HTMLCanvasElement;

	return canvas;
}

describe("Mosaic Engine", () => {
	it("should generate a mosaic with correct dimensions", async () => {
		const sourceImage: SourceImageInfo = {
			width: 16,
			height: 16,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [
			makeTessera({
				fileName: "test1.jpg",
				previewUrl: "data:image/png;base64,test1",
			}),
			makeTessera({
				fileName: "test2.jpg",
				previewUrl: "data:image/png;base64,test2",
			}),
		];

		const tesseraSize = 8;

		const result = await generateMosaic(
			sourceImage,
			tesserae,
			tesseraSize,
			createMockCanvas,
		);

		expect(result).toBeDefined();
		expect(result.width).toBe(sourceImage.width);
		expect(result.height).toBe(sourceImage.height);
		expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
	});

	it("should handle empty tesserae collection", async () => {
		const sourceImage: SourceImageInfo = {
			width: 8,
			height: 8,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [];
		const tesseraSize = 8;

		const result = await generateMosaic(
			sourceImage,
			tesserae,
			tesseraSize,
			createMockCanvas,
		);

		expect(result).toBeDefined();
		expect(result.width).toBe(sourceImage.width);
		expect(result.height).toBe(sourceImage.height);
	});

	it("should handle single tesserae", async () => {
		const sourceImage: SourceImageInfo = {
			width: 8,
			height: 8,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [makeTessera({ fileName: "test1.jpg" })];

		const tesseraSize = 8;

		const result = await generateMosaic(
			sourceImage,
			tesserae,
			tesseraSize,
			createMockCanvas,
		);

		expect(result).toBeDefined();
		expect(result.width).toBe(sourceImage.width);
		expect(result.height).toBe(sourceImage.height);
	});

	it("should validate tessera size inputs", async () => {
		const sourceImage: SourceImageInfo = {
			width: 16,
			height: 16,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [makeTessera()];

		await expect(
			generateMosaic(sourceImage, tesserae, 0, createMockCanvas),
		).rejects.toThrow("Tessera size must be positive");
		await expect(
			generateMosaic(sourceImage, tesserae, -5, createMockCanvas),
		).rejects.toThrow("Tessera size must be positive");
	});

	it("should validate source image dimensions", async () => {
		const sourceImage: SourceImageInfo = {
			width: 0,
			height: 0,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [makeTessera()];

		const tesseraSize = 8;

		await expect(
			generateMosaic(sourceImage, tesserae, tesseraSize, createMockCanvas),
		).rejects.toThrow("Source image dimensions must be positive");
	});

	it("should filter out invalid tesserae", async () => {
		const sourceImage: SourceImageInfo = {
			width: 16,
			height: 16,
			orientation: 1,
		};

		const tesserae: TesseraInfo[] = [
			makeTessera({
				fileName: "test1.jpg",
				previewUrl: "data:image/png;base64,valid1",
			}),
			makeTessera({
				fileName: "test2.jpg",
				isValid: false,
				error: "Invalid format",
				previewUrl: null,
			}),
			makeTessera({
				fileName: "test3.jpg",
				previewUrl: "data:image/png;base64,valid2",
			}),
		];

		const tesseraSize = 8;

		const result = await generateMosaic(
			sourceImage,
			tesserae,
			tesseraSize,
			createMockCanvas,
		);

		expect(result).toBeDefined();
		expect(result.width).toBe(sourceImage.width);
		expect(result.height).toBe(sourceImage.height);
		// Should generate a real mosaic, not a placeholder when valid tesserae exist
		expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
		expect(result.dataUrl).not.toContain("placeholder");
	});

	it("should generate a real mosaic with valid tesserae", async () => {
		// Create a simple 4x4 source image with a gradient
		const sourceImage: SourceImageInfo = {
			width: 4,
			height: 4,
			orientation: 1,
		};

		// Create simple tesserae with different colors
		const tesserae: TesseraInfo[] = [
			makeTessera({
				fileName: "red.jpg",
				previewUrl: "data:image/png;base64,red",
			}),
			makeTessera({
				fileName: "blue.jpg",
				previewUrl: "data:image/png;base64,blue",
			}),
		];

		const tesseraSize = 2;

		const result = await generateMosaic(
			sourceImage,
			tesserae,
			tesseraSize,
			createMockCanvas,
		);

		expect(result).toBeDefined();
		expect(result.width).toBe(sourceImage.width);
		expect(result.height).toBe(sourceImage.height);
		expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
		// Should generate a real mosaic, not a placeholder
		expect(result.dataUrl).not.toContain("placeholder");
	});
});
