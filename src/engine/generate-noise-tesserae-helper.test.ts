import { describe, expect, it } from "vitest";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";

/**
 * Minimal in-memory canvas stub, since jsdom does not implement a 2D context.
 */
function createFakeCanvas(width: number, height: number): HTMLCanvasElement {
	const context = {
		createImageData: (w: number, h: number) => ({
			width: w,
			height: h,
			data: new Uint8ClampedArray(w * h * 4),
		}),
		putImageData: () => {},
		drawImage: () => {},
		getImageData: (_x: number, _y: number, w: number, h: number) => ({
			width: w,
			height: h,
			data: new Uint8ClampedArray(w * h * 4).fill(128),
		}),
	};

	return {
		width,
		height,
		getContext: () => context,
		toDataURL: () => "data:image/png;base64,",
	} as unknown as HTMLCanvasElement;
}

/** Stands in for a decoded source image; the fake canvas ignores its pixels. */
async function fakeImageLoader(): Promise<HTMLImageElement> {
	return {} as HTMLImageElement;
}

const sourceImage = {
	width: 100,
	height: 100,
	orientation: 1,
	url: "blob:source",
};

describe("generateNoiseTesseraeFromState", () => {
	it("generates tesserae based on the given parameters", async () => {
		const tesserae = await generateNoiseTesseraeFromState(
			{ sourceImage, adjustedTesseraSize: 10, seed: 12345 },
			createFakeCanvas,
			fakeImageLoader,
		);

		// Should generate the recommended count (10% of 100 cells = 10, capped at 100 = 10)
		expect(tesserae).toHaveLength(10);
		expect(tesserae[0].isValid).toBe(true);
	});

	it("uses explicit count when provided", async () => {
		const tesserae = await generateNoiseTesseraeFromState(
			{
				sourceImage,
				adjustedTesseraSize: 10,
				seed: 12345,
				generatedTesseraCount: 5,
			},
			createFakeCanvas,
			fakeImageLoader,
		);

		expect(tesserae).toHaveLength(5);
	});

	it("throws error when source image is missing", async () => {
		await expect(
			generateNoiseTesseraeFromState({
				sourceImage: null,
				adjustedTesseraSize: 10,
				seed: 12345,
			}),
		).rejects.toThrow("Source image and adjusted tessera size are required");
	});

	it("throws error when adjusted tessera size is missing", async () => {
		await expect(
			generateNoiseTesseraeFromState({
				sourceImage,
				adjustedTesseraSize: null,
				seed: 12345,
			}),
		).rejects.toThrow("Source image and adjusted tessera size are required");
	});
});
