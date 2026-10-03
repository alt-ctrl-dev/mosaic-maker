import { generateMosaic } from "../mosaic-engine";
import type { SourceImageInfo } from "../image-processing";
import type { TesseraInfo } from "../workflow-state";

const mockCanvasContext = {
	fillRect: vi.fn(),
	drawImage: vi.fn(),
	getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(36) }),
	clearRect: vi.fn(),
	globalAlpha: 1,
};

const mockCanvas = {
	width: 100,
	height: 100,
	getContext: vi.fn().mockReturnValue(mockCanvasContext),
	toDataURL: vi.fn().mockReturnValue("data:image/png;base64,test"),
};

const mockImage = {
	naturalWidth: 100,
	naturalHeight: 100,
};

function makeSourceImage(width: number, height: number): SourceImageInfo {
	return { width, height, orientation: 1, url: "test-url" };
}

function makeTesserae(count: number): TesseraInfo[] {
	return Array.from({ length: count }, (_, i) => ({
		fileName: `tessera-${i}.jpg`,
		file: new File([], `tessera-${i}.jpg`),
		previewUrl: `preview-${i}`,
		isValid: true,
		error: null,
		isLowResolution: false,
	}));
}

describe("Mosaic generation benchmark", () => {
	const mockCanvasCreator = vi.fn().mockReturnValue(mockCanvas);
	const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvasContext.drawImage.mockClear();
		mockCanvasContext.getImageData.mockClear();
		mockCanvasContext.clearRect.mockClear();
	});

	it("should measure performance for different image sizes", async () => {
		const tesserae = makeTesserae(20);

		// Small image benchmark
		const startSmall = performance.now();
		await generateMosaic(
			makeSourceImage(200, 150),
			tesserae,
			20,
			mockCanvasCreator,
			mockImageLoader,
		);
		const durationSmall = performance.now() - startSmall;

		// Medium image benchmark
		const startMedium = performance.now();
		await generateMosaic(
			makeSourceImage(600, 400),
			tesserae,
			20,
			mockCanvasCreator,
			mockImageLoader,
		);
		const durationMedium = performance.now() - startMedium;

		// Large image benchmark
		const startLarge = performance.now();
		await generateMosaic(
			makeSourceImage(1200, 800),
			tesserae,
			20,
			mockCanvasCreator,
			mockImageLoader,
		);
		const durationLarge = performance.now() - startLarge;

		console.log("Benchmark results:");
		console.log(`Small image (200x150): ${durationSmall.toFixed(2)}ms`);
		console.log(`Medium image (600x400): ${durationMedium.toFixed(2)}ms`);
		console.log(`Large image (1200x800): ${durationLarge.toFixed(2)}ms`);

		// The large image should not take excessively longer than the small one
		// This is a rough check - in reality, larger images should scale reasonably
		expect(durationLarge).toBeLessThan(durationSmall * 50); // Not exponential growth
	});

	it("should measure performance for different numbers of tesserae", async () => {
		const sourceImage = makeSourceImage(400, 300);

		// Few tesserae
		const fewTesserae = makeTesserae(5);
		const startFew = performance.now();
		await generateMosaic(
			sourceImage,
			fewTesserae,
			20,
			mockCanvasCreator,
			mockImageLoader,
		);
		const durationFew = performance.now() - startFew;

		// Many tesserae
		const manyTesserae = makeTesserae(50);
		const startMany = performance.now();
		await generateMosaic(
			sourceImage,
			manyTesserae,
			20,
			mockCanvasCreator,
			mockImageLoader,
		);
		const durationMany = performance.now() - startMany;

		console.log("Tesserae count benchmark:");
		console.log(`5 tesserae: ${durationFew.toFixed(2)}ms`);
		console.log(`50 tesserae: ${durationMany.toFixed(2)}ms`);

		// With more tesserae, it should take longer but not exponentially so
		expect(durationMany).toBeLessThan(durationFew * 15);
	});
});
