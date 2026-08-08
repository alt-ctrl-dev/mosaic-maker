import { describe, expect, it } from "vitest";
import type { SourceImageInfo } from "./image-processing";
import { generateMosaic } from "./mosaic-engine";
import type { TesseraInfo } from "./workflow-state";

/**
 * jsdom has no real 2D canvas, so these tests use a tiny software raster that
 * models the parts of the canvas API the engine relies on: `drawImage` with
 * scaling and `globalAlpha`, `getImageData`, and `toDataURL`.
 */
interface Raster {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

function makeRaster(
	width: number,
	height: number,
	pixelAt: (x: number, y: number) => [number, number, number, number?],
): Raster {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const rgba = pixelAt(x, y);
			const offset = (y * width + x) * 4;
			data[offset] = rgba[0]; // R
			data[offset + 1] = rgba[1]; // G
			data[offset + 2] = rgba[2]; // B
			data[offset + 3] = rgba[3] ?? 255; // A, default to opaque
		}
	}
	return { width, height, data };
}

const solid = (size: number, rgba: [number, number, number, number?]): Raster =>
	makeRaster(size, size, () => rgba);

function createFakeCanvas(width: number, height: number): HTMLCanvasElement {
	const raster = makeRaster(width, height, () => [0, 0, 0, 255]);
	let globalAlpha = 1;

	const context = {
		get globalAlpha() {
			return globalAlpha;
		},
		set globalAlpha(value: number) {
			globalAlpha = value;
		},
		fillStyle: "",
		fillRect: () => {},
		getImageData: (x: number, y: number, w: number, h: number) => {
			const data = new Uint8ClampedArray(w * h * 4);
			for (let row = 0; row < h; row++) {
				for (let col = 0; col < w; col++) {
					const from = ((y + row) * raster.width + (x + col)) * 4;
					const to = (row * w + col) * 4;
					data.set(raster.data.subarray(from, from + 4), to);
				}
			}
			return { width: w, height: h, data };
		},
		putImageData: (
			imageData: { width: number; height: number; data: Uint8ClampedArray },
			dx: number,
			dy: number,
		) => {
			const { data, width, height } = imageData;
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const srcIdx = (y * width + x) * 4;
					const destX = dx + x;
					const destY = dy + y;
					if (
						destX >= 0 &&
						destY >= 0 &&
						destX < raster.width &&
						destY < raster.height
					) {
						const destIdx = (destY * raster.width + destX) * 4;
						raster.data[destIdx] = data[srcIdx];
						raster.data[destIdx + 1] = data[srcIdx + 1];
						raster.data[destIdx + 2] = data[srcIdx + 2];
						raster.data[destIdx + 3] = data[srcIdx + 3];
					}
				}
			}
		},
		drawImage: (source: { raster: Raster }, ...args: number[]) => {
			const src = source.raster;
			const [sx, sy, sw, sh, dx, dy, dw, dh] =
				args.length === 8
					? args
					: args.length === 4
						? [0, 0, src.width, src.height, args[0], args[1], args[2], args[3]]
						: [
								0,
								0,
								src.width,
								src.height,
								args[0],
								args[1],
								src.width,
								src.height,
							];

			for (let y = 0; y < dh; y++) {
				for (let x = 0; x < dw; x++) {
					const destX = dx + x;
					const destY = dy + y;
					if (
						destX < 0 ||
						destY < 0 ||
						destX >= raster.width ||
						destY >= raster.height
					) {
						continue;
					}
					const srcX = Math.min(
						src.width - 1,
						Math.floor(sx + ((x + 0.5) * sw) / dw),
					);
					const srcY = Math.min(
						src.height - 1,
						Math.floor(sy + ((y + 0.5) * sh) / dh),
					);
					const srcOffset = (srcY * src.width + srcX) * 4;
					const destOffset = (destY * raster.width + destX) * 4;

					const srcR = src.data[srcOffset];
					const srcG = src.data[srcOffset + 1];
					const srcB = src.data[srcOffset + 2];
					const srcA = src.data[srcOffset + 3] / 255;

					const destR = raster.data[destOffset];
					const destG = raster.data[destOffset + 1];
					const destB = raster.data[destOffset + 2];

					const effectiveAlpha = srcA * globalAlpha;

					if (effectiveAlpha === 1) {
						raster.data[destOffset] = srcR;
						raster.data[destOffset + 1] = srcG;
						raster.data[destOffset + 2] = srcB;
						raster.data[destOffset + 3] = 255;
					} else if (effectiveAlpha > 0) {
						raster.data[destOffset] = Math.round(
							srcR * effectiveAlpha + destR * (1 - effectiveAlpha),
						);
						raster.data[destOffset + 1] = Math.round(
							srcG * effectiveAlpha + destG * (1 - effectiveAlpha),
						);
						raster.data[destOffset + 2] = Math.round(
							srcB * effectiveAlpha + destB * (1 - effectiveAlpha),
						);
						raster.data[destOffset + 3] = 255;
					}
				}
			}
		},
	};

	return {
		width,
		height,
		raster,
		getContext: () => context,
		toDataURL: () => `data:image/png;base64,${btoa(String(raster.data))}`,
	} as unknown as HTMLCanvasElement;
}

/** Maps preview/source URLs to the pixels a loaded image would expose. */
const IMAGE_RASTERS: Record<string, Raster> = {
	"blob:source-transparent": makeRaster(4, 4, (x, y) =>
		x < 2 ? [255, 0, 0, 255] : [0, 0, 255, Math.floor(128 + 64 * (y / 3))],
	),
	"data:red": solid(2, [255, 0, 0, 255]),
	"data:blue": solid(2, [0, 0, 255, 255]),
	"data:transparent-red": solid(2, [255, 0, 0, 128]), // Semi-transparent red
	"data:fully-transparent": solid(2, [0, 0, 0, 0]), // Fully transparent
};

async function fakeImageLoader(url: string): Promise<HTMLImageElement> {
	const raster = IMAGE_RASTERS[url] ?? solid(2, [128, 128, 128, 255]);
	return { raster, width: raster.width, height: raster.height } as never;
}

function makeTessera(overrides: Partial<TesseraInfo> = {}): TesseraInfo {
	return {
		file: new File([], "test.jpg", { type: "image/jpeg" }),
		fileName: "test.jpg",
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: "data:red",
		...overrides,
	};
}

const sourceImage: SourceImageInfo = {
	width: 4,
	height: 4,
	orientation: 1,
	url: "blob:source-transparent",
};

function generate(tesserae: TesseraInfo[], tesseraSize = 2) {
	return generateMosaic(
		sourceImage,
		tesserae,
		tesseraSize,
		createFakeCanvas,
		fakeImageLoader,
	);
}

/** Read a pixel back out of a data URL produced by {@link createFakeCanvas}. */
function pixelAt(dataUrl: string, x: number, y: number, width: number) {
	const bytes = dataUrl.replace(/^data:image\/png;base64,/, "");
	const values = atob(bytes).split(",").map(Number);
	const offset = (y * width + x) * 4;
	return values.slice(offset, offset + 4);
}

describe("Mosaic Engine Transparency Rules", () => {
	it("transparent tessera pixels let source show through", async () => {
		const result = await generate([
			makeTessera({
				fileName: "transparent.png",
				previewUrl: "data:fully-transparent",
			}),
		]);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);

		const leftPixel = pixelAt(result.dataUrl, 0, 0, 4);
		expect(leftPixel[0]).toBeGreaterThan(0);
		expect(leftPixel[0]).toBeLessThan(255);

		const rightPixel = pixelAt(result.dataUrl, 3, 3, 4);
		expect(rightPixel[2]).toBeGreaterThan(0);
	});

	it("partial source alpha yields proportionally reduced tessera visibility", async () => {
		const result = await generate([
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
		]);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);

		const pixel = pixelAt(result.dataUrl, 3, 3, 4);
		expect(pixel[0]).toBeGreaterThan(100);
		expect(pixel[2]).toBeGreaterThan(30);
	});

	it("produces valid PNG data URL for opaque source regions", async () => {
		const result = await generate([
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
		]);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);
		expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
	});
});
