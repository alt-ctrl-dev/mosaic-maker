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

describe("Mosaic generation performance optimization", () => {
	const mockCanvasCreator = vi.fn().mockReturnValue(mockCanvas);
	const mockImageLoader = vi.fn().mockResolvedValue(mockImage);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCanvasContext.drawImage.mockClear();
		mockCanvasContext.getImageData.mockClear();
		mockCanvasContext.clearRect.mockClear();
	});

	it("should optimize color grid sampling by batching operations", async () => {
		const tesserae = makeTesserae(20);

		const startTime = performance.now();

		await generateMosaic(
			makeSourceImage(800, 600),
			tesserae,
			32,
			mockCanvasCreator,
			mockImageLoader,
		);

		const duration = performance.now() - startTime;

		// With optimization, this should complete faster
		expect(duration).toBeLessThan(2000);
	});

	it("should reduce the number of canvas operations", async () => {
		const tesserae = makeTesserae(10);

		await generateMosaic(
			makeSourceImage(400, 300),
			tesserae,
			32,
			mockCanvasCreator,
			mockImageLoader,
		);

		// Count canvas creation calls
		const canvasCreationCalls = mockCanvasCreator.mock.calls.length;

		// With optimization, we should create fewer canvases
		// Original implementation creates many temporary canvases for color sampling
		expect(canvasCreationCalls).toBeLessThan(50);
	});
});
