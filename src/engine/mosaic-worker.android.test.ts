import { describe, expect, it, vi } from "vitest";
import { ANDROID_READBACK_FAILURE } from "./mosaic-shared";
import { offscreenCanvasToDataUrl } from "./mosaic-worker";

interface MockOffscreenCanvas {
	width: number;
	height: number;
	convertToBlob: ReturnType<typeof vi.fn>;
	getContext: ReturnType<typeof vi.fn>;
}

describe("Mosaic Worker Android Compatibility", () => {
	it("should throw a specific error when OffscreenCanvas.convertToBlob fails on Android", async () => {
		// Create a mock OffscreenCanvas that throws the specific Android error
		const mockCanvas: MockOffscreenCanvas = {
			width: 4,
			height: 4,
			convertToBlob: vi
				.fn()
				.mockRejectedValue(
					new DOMException(
						"Failed to execute 'convertToBlob' on 'OffscreenCanvas': Readback of the source image has failed",
						"OperationError",
					),
				),
			getContext: vi.fn().mockReturnValue({
				getImageData: vi.fn().mockReturnValue({
					width: 2,
					height: 2,
					data: new Uint8ClampedArray([
						255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 255, 255, 0, 0, 255,
					]),
				}),
			}),
		};

		await expect(
			offscreenCanvasToDataUrl(
				mockCanvas as unknown as OffscreenCanvas,
				"image/png",
			),
		).rejects.toThrow(ANDROID_READBACK_FAILURE);
	});

	it("should rethrow non-Android errors", async () => {
		const mockCanvas: MockOffscreenCanvas = {
			width: 4,
			height: 4,
			convertToBlob: vi.fn().mockRejectedValue(new Error("Some other error")),
			getContext: vi.fn(),
		};

		await expect(
			offscreenCanvasToDataUrl(
				mockCanvas as unknown as OffscreenCanvas,
				"image/png",
			),
		).rejects.toThrow("Some other error");
	});

	it("should handle case insensitive readback error messages", async () => {
		// Test with lowercase "readback"
		const mockCanvas: MockOffscreenCanvas = {
			width: 4,
			height: 4,
			convertToBlob: vi
				.fn()
				.mockRejectedValue(
					new DOMException(
						"Failed to execute 'convertToBlob' on 'OffscreenCanvas': readback of the source image has failed",
						"OperationError",
					),
				),
			getContext: vi.fn().mockReturnValue({
				getImageData: vi.fn().mockReturnValue({
					width: 2,
					height: 2,
					data: new Uint8ClampedArray([
						255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 255, 255, 0, 0, 255,
					]),
				}),
			}),
		};

		await expect(
			offscreenCanvasToDataUrl(
				mockCanvas as unknown as OffscreenCanvas,
				"image/png",
			),
		).rejects.toThrow(ANDROID_READBACK_FAILURE);
	});
});
