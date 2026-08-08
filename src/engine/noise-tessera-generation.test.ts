import { describe, expect, it } from "vitest";
import type { SourceImageInfo } from "./image-processing";
import { generateTesseraeUsingNoise } from "./noise-tessera-generation";

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
		drawImage: () => {},
		// Stands in for the downsampled source image: a pure-green palette, so
		// tests can assert that generated tesserae take their color from the
		// source rather than from an invented tint.
		getImageData: (_x: number, _y: number, w: number, h: number) => {
			const data = new Uint8ClampedArray(w * h * 4);
			for (let offset = 0; offset < data.length; offset += 4) {
				data[offset + 1] = 200;
				data[offset + 3] = 255;
			}
			return { width: w, height: h, data };
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
	url: "blob:source",
};

async function fakeImageLoader(): Promise<HTMLImageElement> {
	return {} as HTMLImageElement;
}

function generate(count: number, size: number, seed: number) {
	return generateTesseraeUsingNoise(
		mockSourceImage,
		count,
		size,
		seed,
		createFakeCanvas,
		fakeImageLoader,
	);
}

describe("noise-tessera-generation", () => {
	describe("stable identity", () => {
		it("generates unique filenames across repeated generations with the same parameters", async () => {
			const firstBatch = await generate(3, 10, 12345);
			const secondBatch = await generate(3, 10, 12345);

			const allFilenames = [
				...firstBatch.map((t) => t.fileName),
				...secondBatch.map((t) => t.fileName),
			];

			expect(new Set(allFilenames).size).toBe(6);
		});
	});
});
