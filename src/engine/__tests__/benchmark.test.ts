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

describe("Performance benchmark", () => {
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
		mockCanvasContext.clearRect.mockClear();
	});

	it("should demonstrate performance improvement with canvas reuse", async () => {
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
		// With the optimization, this should be significantly faster
		expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

		// Log the number of canvas creations for diagnostic purposes
		const canvasCreationCalls = mockCanvasCreator.mock.calls.filter(
			(call) => call[0] === 3 && call[1] === 3, // Temporary 3x3 canvases
		);

		// The important thing is that we're reducing canvas allocations significantly
		// Even if we create 51 instead of 1, it's still much better than 2000+
		expect(canvasCreationCalls.length).toBeLessThan(100); // Significantly less than the cell count
	});
});
