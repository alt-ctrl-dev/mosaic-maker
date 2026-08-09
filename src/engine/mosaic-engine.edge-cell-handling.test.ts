import { describe, expect, it, vi } from "vitest";
import { generateMosaic } from "./mosaic-engine";
import type { TesseraInfo } from "./workflow-state";

describe("mosaic-engine edge cell handling", () => {
	it("should handle partial edge cells correctly", async () => {
		// Create a small test case that will definitely have partial edge cells
		const mockSourceImage = {
			url: "data:image/png;base64,mock",
			width: 23, // Prime number - will have partial cells with tessera size 10
			height: 17, // Prime number - will have partial cells with tessera size 10
			orientation: 1,
		};

		const mockTesserae: TesseraInfo[] = [
			{
				fileName: "test-tessera.png",
				previewUrl: "data:image/png;base64,mock-tessera",
				isValid: true,
				isSupplemented: false,
				isLowResolution: false,
				file: new File([], "test-tessera.png"),
				error: null,
			},
		];

		const mockCanvasCreator = vi.fn((width: number, height: number) => {
			return {
				width,
				height,
				getContext: () => ({
					drawImage: vi.fn(),
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

		// Grid is ceil(23/10) × ceil(17/10) = 3 × 2 = 6 cells with partial edge regions.
		// The test passes as long as generation completes without error.
	});
});
