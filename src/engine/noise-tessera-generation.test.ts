import { describe, expect, it } from "vitest";
import {
	generateNoiseTesserae,
	calculateRecommendedTesseraCount,
} from "./noise-tessera-generation";
import type { SourceImageInfo } from "./image-processing";

describe("noise-tessera-generation", () => {
	describe("calculateRecommendedTesseraCount", () => {
		it("returns 10% of grid cells capped at 100", () => {
			// 100x100 grid = 10,000 cells, 10% = 1,000, capped at 100
			expect(calculateRecommendedTesseraCount(10000)).toBe(100);

			// 50x50 grid = 2,500 cells, 10% = 250, capped at 100
			expect(calculateRecommendedTesseraCount(2500)).toBe(100);

			// 20x20 grid = 400 cells, 10% = 40, not capped
			expect(calculateRecommendedTesseraCount(400)).toBe(40);

			// 5x5 grid = 25 cells, 10% = 2.5, rounded down to 2
			expect(calculateRecommendedTesseraCount(25)).toBe(2);
		});
	});

	describe("generateNoiseTesserae", () => {
		const mockSourceImage: SourceImageInfo = {
			width: 100,
			height: 100,
			orientation: 1,
		};

		it("generates the requested number of tesserae", async () => {
			const tesserae = await generateNoiseTesserae(
				mockSourceImage,
				10,
				10,
				12345,
			);

			expect(tesserae).toHaveLength(10);
			tesserae.forEach((tessera) => {
				expect(tessera.isValid).toBe(true);
				expect(tessera.error).toBeNull();
				expect(tessera.isLowResolution).toBe(false);
				expect(tessera.previewUrl).toMatch(/^data:image\/png;base64,/);
				expect(tessera.fileName).toMatch(/^generated-\d+/);
				expect(tessera.fileName).toMatch(/\.png$/);
			});
		});

		it("produces deterministic results with the same seed", async () => {
			const tesserae1 = await generateNoiseTesserae(
				mockSourceImage,
				5,
				10,
				12345,
			);
			const tesserae2 = await generateNoiseTesserae(
				mockSourceImage,
				5,
				10,
				12345,
			);

			expect(tesserae1).toEqual(tesserae2);
		});

		it("produces different results with different seeds", async () => {
			const tesserae1 = await generateNoiseTesserae(
				mockSourceImage,
				5,
				10,
				12345,
			);
			const tesserae2 = await generateNoiseTesserae(
				mockSourceImage,
				5,
				10,
				54321,
			);

			expect(tesserae1).not.toEqual(tesserae2);
		});

		it("assigns tesserae with either smooth or sharp noise styles", async () => {
			const tesserae = await generateNoiseTesserae(
				mockSourceImage,
				20,
				10,
				12345,
			);

			// Should have both smooth and sharp styles
			const hasSmooth = tesserae.some((t) => t.fileName.includes("-smooth-"));
			const hasSharp = tesserae.some((t) => t.fileName.includes("-sharp-"));

			expect(hasSmooth).toBe(true);
			expect(hasSharp).toBe(true);
		});
	});
});
