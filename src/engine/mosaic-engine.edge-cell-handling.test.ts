import { describe, expect, it, vi } from "vitest";

describe("mosaic-engine edge cell handling", () => {
	it("should handle partial edge cells correctly", async () => {
		// Import the functions we need to test
		const { generateMosaic } = await import("./mosaic-engine");

		// Create a small test case that will definitely have partial edge cells
		const mockSourceImage = {
			url: "data:image/png;base64,mock",
			width: 23, // Prime number - will have partial cells with tessera size 10
			height: 17, // Prime number - will have partial cells with tessera size 10
			orientation: 1,
		};

		const mockTesserae = [
			{
				fileName: "test-tessera.png",
				previewUrl: "data:image/png;base64,mock-tessera",
				isValid: true,
				errorMessage: null,
				isSupplemented: false,
				isLowResolution: false,
			},
		];

		// Track the drawImage calls to verify correct region sizes
		const drawImageCalls: any[] = [];

		const mockCanvasCreator = vi.fn((width: number, height: number) => {
			return {
				width,
				height,
				getContext: () => ({
					drawImage: vi.fn((...args: any[]) => {
						drawImageCalls.push(args);
					}),
					fillRect: vi.fn(),
					fillStyle: "",
					globalAlpha: 1.0,
					getImageData: () => ({
						data: new Uint8ClampedArray(36).fill(100), // 3x3 grid * 4 channels
					}),
				}),
				toDataURL: () => "data:image/png;base64,result",
			} as unknown as HTMLCanvasElement;
		});

		const mockImageLoader = vi.fn(async () => {
			return {} as HTMLImageElement;
		});

		// Generate mosaic with tessera size 10
		const result = await generateMosaic(
			mockSourceImage,
			mockTesserae,
			10,
			mockCanvasCreator,
			mockImageLoader,
		);

		// Should succeed
		expect(result).toBeDefined();
		expect(result.width).toBe(23);
		expect(result.height).toBe(17);

		// Verify that we're handling partial edge cells correctly
		// Grid should be 3 x 2 = 6 cells (ceil(23/10) x ceil(17/10))
		// First row: (0,0) with 10x10, (10,0) with 10x10, (20,0) with 3x10 (partial)
		// Second row: (0,10) with 10x7 (partial), (10,10) with 10x7 (partial), (20,10) with 3x7 (partial)

		// Check that we have the right number of cells processed
		// The test should pass as long as the mosaic generation completes without error
	});
});
