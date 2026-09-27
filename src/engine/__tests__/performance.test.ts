import { generateMosaic } from "../mosaic-engine";
import type { SourceImageInfo } from "../image-processing";
import type { TesseraInfo } from "../workflow-state";

// Mock canvas implementation for testing
const mockCanvasContext = {
	fillRect: vi.fn(),
	drawImage: vi.fn(),
	getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(36) }), // 3x3x4
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

describe("Performance tests", () => {
	const mockCanvasCreator = vi.fn().mockReturnValue(mockCanvas);
	const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

	const sourceImage: SourceImageInfo = {
		width: 1920,
		height: 1080,
		orientation: 1,
		url: "test-url",
	};

	const tesserae: TesseraInfo[] = Array.from({ length: 50 }, (_, i) => ({
		fileName: `tessera-${i}.jpg`,
		file: new File([], `tessera-${i}.jpg`),
		previewUrl: `preview-${i}`,
		isValid: true,
		error: null,
		isLowResolution: false,
	}));

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvasContext.drawImage.mockClear();
		mockCanvasContext.getImageData.mockClear();
	});

	it("should complete mosaic generation for large image within reasonable time", async () => {
		const startTime = performance.now();

		await generateMosaic(
			sourceImage,
			tesserae,
			32, // 32px tessera size
			mockCanvasCreator,
			mockImageLoader,
		);

		const endTime = performance.now();
		const duration = endTime - startTime;

		// For a 1920x1080 image with 32px tesserae, we have about 2000 cells
		// Each cell involves multiple canvas operations
		// This should complete in under 5 seconds on a reasonable machine
		expect(duration).toBeLessThan(5000);

		// Verify the number of canvas operations is reasonable
		// For large images, we create many temporary canvases for color sampling
		expect(mockCanvasCreator).toHaveBeenCalled();
	});

	it("should scale reasonably with image size", async () => {
		// Test with smaller image first
		const smallSource: SourceImageInfo = {
			width: 640,
			height: 480,
			orientation: 1,
			url: "test-url",
		};

		const startTimeSmall = performance.now();
		await generateMosaic(
			smallSource,
			tesserae,
			32,
			mockCanvasCreator,
			mockImageLoader,
		);
		const endTimeSmall = performance.now();
		const durationSmall = endTimeSmall - startTimeSmall;

		// Test with larger image
		const largeSource: SourceImageInfo = {
			width: 3840,
			height: 2160,
			orientation: 1,
			url: "test-url",
		};

		const startTimeLarge = performance.now();
		await generateMosaic(
			largeSource,
			tesserae,
			32,
			mockCanvasCreator,
			mockImageLoader,
		);
		const endTimeLarge = performance.now();
		const durationLarge = endTimeLarge - startTimeLarge;

		// The large image should take roughly 4x longer than the small one
		// (4x width, 4x height = 16x more cells, but we're using the same tessera count)
		// But it shouldn't be exponentially slower
		expect(durationLarge).toBeLessThan(durationSmall * 20);
	});
});
