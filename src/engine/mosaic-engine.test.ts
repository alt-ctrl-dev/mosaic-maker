import { describe, expect, it } from "vitest";
import type { SourceImageInfo } from "./image-processing";
import { generateMosaic } from "./mosaic-engine";
import type { TesseraInfo } from "./workflow-state";

/**
 * jsdom has no real 2D canvas, so these tests use a tiny software raster that
 * models the parts of the canvas API the engine relies on: `drawImage` with
 * scaling and `globalAlpha`, `getImageData`, and `toDataURL`. This lets the
 * tests assert on the actual mosaic pixels rather than on a mock's identity.
 */
interface Raster {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

function makeRaster(
	width: number,
	height: number,
	pixelAt: (x: number, y: number) => [number, number, number],
): Raster {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [r, g, b] = pixelAt(x, y);
			const offset = (y * width + x) * 4;
			data[offset] = r;
			data[offset + 1] = g;
			data[offset + 2] = b;
			data[offset + 3] = 255;
		}
	}
	return { width, height, data };
}

const solid = (size: number, rgb: [number, number, number]): Raster =>
	makeRaster(size, size, () => rgb);

function createFakeCanvas(width: number, height: number): HTMLCanvasElement {
	const raster = makeRaster(width, height, () => [0, 0, 0]);
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
					for (let channel = 0; channel < 3; channel++) {
						raster.data[destOffset + channel] =
							src.data[srcOffset + channel] * globalAlpha +
							raster.data[destOffset + channel] * (1 - globalAlpha);
					}
					raster.data[destOffset + 3] = 255;
				}
			}
		},
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
	};

	return {
		width,
		height,
		raster,
		getContext: () => context,
		toDataURL: () => `data:image/png;base64,${btoa(String(raster.data))}`,
	} as unknown as HTMLCanvasElement;
}

const RED: [number, number, number] = [255, 0, 0];
const BLUE: [number, number, number] = [0, 0, 255];

/** Maps preview/source URLs to the pixels a loaded image would expose. */
const IMAGE_RASTERS: Record<string, Raster> = {
	"blob:source": makeRaster(4, 4, (x) => (x < 2 ? RED : BLUE)),
	"data:red": solid(2, RED),
	"data:blue": solid(2, BLUE),
};

async function fakeImageLoader(url: string): Promise<HTMLImageElement> {
	const raster = IMAGE_RASTERS[url] ?? solid(2, [128, 128, 128]);
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
	url: "blob:source",
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
	return values.slice(offset, offset + 3);
}

describe("Mosaic Engine", () => {
	it("matches each cell to the closest tessera and blends in the source", async () => {
		const result = await generate([
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
			makeTessera({ fileName: "blue.png", previewUrl: "data:blue" }),
		]);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);

		// The left half of the source is red and the right half blue, so each
		// half must be covered by the matching tessera. Pixels are 75% tessera
		// over 25% source, which for a match leaves the pure tessera color.
		expect(pixelAt(result.dataUrl, 0, 0, 4)).toEqual([255, 0, 0]);
		expect(pixelAt(result.dataUrl, 3, 3, 4)).toEqual([0, 0, 255]);
	});

	it("blends 25% of the source into a mismatched cell", async () => {
		// Only a red tessera is available, so the blue half is red tessera
		// blended with 25% blue source.
		const result = await generate([
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
		]);

		expect(pixelAt(result.dataUrl, 3, 3, 4)).toEqual([191, 0, 64]);
	});

	it("returns a placeholder when no valid tesserae remain", async () => {
		const result = await generate([]);

		expect(result.width).toBe(4);
		expect(result.height).toBe(4);
		expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
	});

	it("filters out invalid tesserae", async () => {
		const result = await generate([
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
			makeTessera({
				fileName: "broken.png",
				isValid: false,
				error: "Invalid format",
				previewUrl: null,
			}),
		]);

		expect(pixelAt(result.dataUrl, 0, 0, 4)).toEqual([255, 0, 0]);
	});

	it("is deterministic for identical inputs", async () => {
		const tesserae = [
			makeTessera({ fileName: "red.png", previewUrl: "data:red" }),
			makeTessera({ fileName: "blue.png", previewUrl: "data:blue" }),
		];

		const first = await generate(tesserae);
		const second = await generate(tesserae);

		expect(first.dataUrl).toBe(second.dataUrl);
	});

	it("validates tessera size inputs", async () => {
		await expect(generate([makeTessera()], 0)).rejects.toThrow(
			"Tessera size must be positive",
		);
		await expect(generate([makeTessera()], -5)).rejects.toThrow(
			"Tessera size must be positive",
		);
	});

	it("validates source image dimensions", async () => {
		await expect(
			generateMosaic(
				{ ...sourceImage, width: 0, height: 0 },
				[makeTessera()],
				2,
				createFakeCanvas,
				fakeImageLoader,
			),
		).rejects.toThrow("Source image dimensions must be positive");
	});
});
