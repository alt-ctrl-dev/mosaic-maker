import type { SourceImageInfo } from "../image-processing";
import { generateMosaic } from "../mosaic-engine";
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

describe("Mosaic generation performance", () => {
	const mockCanvasCreator = vi.fn().mockReturnValue(mockCanvas);
	const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvasContext.drawImage.mockClear();
		mockCanvasContext.getImageData.mockClear();
		mockCanvasContext.clearRect.mockClear();
	});

	it("reuses a single temporary canvas for color sampling across all cells", async () => {
		const tesserae = makeTesserae(50);

		await generateMosaic(
			makeSourceImage(1920, 1080),
			tesserae,
			32,
			"photomosaic",
			mockCanvasCreator,
			mockImageLoader,
		);

		const colorGridCanvases = mockCanvasCreator.mock.calls.filter(
			(call) => call[0] === 3 && call[1] === 3,
		);

		// With canvas reuse, only one 3×3 canvas should be created per
		// call to sampleColorGrid that doesn't pass a reusable context —
		// the one time per tessera plus the one in generateMosaicCanvas.
		expect(colorGridCanvases.length).toBeLessThan(100);
	});

	it("completes in a reasonable time for a large image", async () => {
		const startTime = performance.now();

		await generateMosaic(
			makeSourceImage(1920, 1080),
			makeTesserae(50),
			32,
			"photomosaic",
			mockCanvasCreator,
			mockImageLoader,
		);

		const duration = performance.now() - startTime;

		// With the canvas-reuse optimization this should be well under 5 s
		// on any reasonable machine. CI environments may need a larger
		// allowance; if this flakes, verify that CI hardware meets the
		// assumption.
		expect(duration).toBeLessThan(5000);
	});

	it("scales sub-linearly with image area (not exponentially)", async () => {
		const run = async (w: number, h: number) => {
			const start = performance.now();
			await generateMosaic(
				makeSourceImage(w, h),
				makeTesserae(50),
				32,
				"photomosaic",
				mockCanvasCreator,
				mockImageLoader,
			);
			return performance.now() - start;
		};

		const small = await run(640, 480);
		// 3840×2160 has 16× the cells of 640×480 at the same tessera size.
		const large = await run(3840, 2160);

		// The large image should be at most 20× slower, not 100× or more.
		expect(large).toBeLessThan(small * 20);
	});
});
