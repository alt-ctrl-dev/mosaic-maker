import { describe, expect, it } from "vitest";
import {
	generateTesseraeUsingNoise,
	calculateRecommendedTesseraCount,
} from "./noise-tessera-generation";
import type { SourceImageInfo } from "./image-processing";

/**
 * Create a lightweight in-memory canvas whose `toDataURL` encodes the pixel
 * bytes written via `putImageData`, so tests can assert on the rendered output.
 * jsdom does not implement a real 2D canvas context.
 */
function createFakeCanvas(width: number, height: number): HTMLCanvasElement {
	let stored: Uint8ClampedArray | null = null;

	const context = {
		createImageData: (w: number, h: number) => ({
			width: w,
			height: h,
			data: new Uint8ClampedArray(w * h * 4),
		}),
		putImageData: (imageData: { data: Uint8ClampedArray }) => {
			stored = imageData.data.slice();
		},
	};

	return {
		width,
		height,
		getContext: () => context,
		toDataURL: () => {
			const bytes = stored ?? new Uint8ClampedArray(0);
			let binary = "";
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			return `data:image/png;base64,${btoa(binary)}`;
		},
	} as unknown as HTMLCanvasElement;
}

const mockSourceImage: SourceImageInfo = {
	width: 100,
	height: 100,
	orientation: 1,
};

function generate(count: number, size: number, seed: number) {
	return generateTesseraeUsingNoise(
		mockSourceImage,
		count,
		size,
		seed,
		createFakeCanvas,
	);
}

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

		it("handles edge case of 10 grid cells correctly", () => {
			// 10 cells should produce count=1 (10% of 10 = 1)
			expect(calculateRecommendedTesseraCount(10)).toBe(1);
		});
	});

	describe("seededRandom", () => {
		it("handles negative seeds correctly", async () => {
			// Test with negative seed - should not throw
			const tesserae = await generate(1, 10, -12345);
			expect(tesserae).toHaveLength(1);
			expect(tesserae[0].isValid).toBe(true);
		});

		it("handles very large seeds correctly", async () => {
			// Test with very large seed - should not throw
			const tesserae = await generate(1, 10, 999999999);
			expect(tesserae).toHaveLength(1);
			expect(tesserae[0].isValid).toBe(true);
		});
	});

	describe("generateTesseraeUsingNoise", () => {
		it("generates the requested number of tesserae", async () => {
			const tesserae = await generate(10, 10, 12345);

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

		it("renders real PNG pixel data rather than encoded metadata", async () => {
			const size = 8;
			const [tessera] = await generate(1, size, 12345);

			expect(tessera.previewUrl).not.toBeNull();
			const base64 = (tessera.previewUrl ?? "").replace(
				/^data:image\/png;base64,/,
				"",
			);
			const decoded = atob(base64);

			// One byte per RGBA channel for every pixel of the size x size canvas.
			expect(decoded.length).toBe(size * size * 4);

			// Alpha channel of every pixel is fully opaque.
			for (let i = 3; i < decoded.length; i += 4) {
				expect(decoded.charCodeAt(i)).toBe(255);
			}

			// Noise varies across pixels rather than a single flat color.
			const redChannels = new Set<number>();
			for (let i = 0; i < decoded.length; i += 4) {
				redChannels.add(decoded.charCodeAt(i));
			}
			expect(redChannels.size).toBeGreaterThan(1);
		});

		it("produces deterministic results with the same seed", async () => {
			const tesserae1 = await generate(5, 10, 12345);
			const tesserae2 = await generate(5, 10, 12345);

			expect(tesserae1.map((t) => t.previewUrl)).toEqual(
				tesserae2.map((t) => t.previewUrl),
			);
		});

		it("produces different pixel data with different seeds", async () => {
			const [tessera1] = await generate(1, 10, 12345);
			const [tessera2] = await generate(1, 10, 54321);

			expect(tessera1.previewUrl).not.toBe(tessera2.previewUrl);
		});

		it("assigns tesserae with either smooth or sharp noise styles", async () => {
			const tesserae = await generate(20, 10, 12345);

			// Should have both smooth and sharp styles
			const hasSmooth = tesserae.some((t) => t.fileName.includes("-smooth-"));
			const hasSharp = tesserae.some((t) => t.fileName.includes("-sharp-"));

			expect(hasSmooth).toBe(true);
			expect(hasSharp).toBe(true);
		});

		it("generates tesserae with unique filenames based on index and seed", async () => {
			const tesserae = await generate(3, 10, 12345);

			expect(tesserae[0].fileName).toBe("generated-0-smooth-12345.png");
			expect(tesserae[1].fileName).toBe("generated-1-smooth-12345.png");
			expect(tesserae[2].fileName).toBe("generated-2-smooth-12345.png");
		});

		it("generates valid tesserae with proper file objects", async () => {
			const tesserae = await generate(1, 10, 12345);

			expect(tesserae[0].file).toBeInstanceOf(File);
			expect(tesserae[0].file.type).toBe("image/png");
			expect(tesserae[0].previewUrl).toMatch(/^data:image\/png;base64,/);
		});
	});
});
