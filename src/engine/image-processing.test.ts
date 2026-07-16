import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getImageFileError,
	getSourceImageInfo,
	isSupportedImageFormat,
} from "./image-processing";

describe("image-processing", () => {
	describe("isSupportedImageFormat", () => {
		it("returns true for JPEG files", () => {
			const file = new File([""], "test.jpg", { type: "image/jpeg" });
			expect(isSupportedImageFormat(file)).toBe(true);
		});

		it("returns true for PNG files", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			expect(isSupportedImageFormat(file)).toBe(true);
		});

		it("returns true for WebP files", () => {
			const file = new File([""], "test.webp", { type: "image/webp" });
			expect(isSupportedImageFormat(file)).toBe(true);
		});

		it("returns false for unsupported formats", () => {
			const file = new File([""], "test.gif", { type: "image/gif" });
			expect(isSupportedImageFormat(file)).toBe(false);
		});

		it("returns false for non-image files", () => {
			const file = new File([""], "test.txt", { type: "text/plain" });
			expect(isSupportedImageFormat(file)).toBe(false);
		});
	});

	describe("getImageFileError", () => {
		it("provides appropriate error for unsupported file types", () => {
			const file = new File([""], "test.gif", { type: "image/gif" });
			expect(getImageFileError(file)).toContain("Unsupported file type");
		});

		it("provides appropriate error for files with no type", () => {
			const file = new File([""], "test.jpg");
			expect(getImageFileError(file)).toContain(
				"File type could not be determined",
			);
		});

		it("provides generic error for supported types that fail processing", () => {
			const file = new File([""], "test.jpg", { type: "image/jpeg" });
			expect(getImageFileError(file)).toContain("could not be processed");
		});
	});

	describe("getSourceImageInfo", () => {
		let mockImageInstance: {
			onload: (() => void) | null;
			onerror: (() => void) | null;
			naturalWidth: number;
			naturalHeight: number;
		};

		class MockImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			src = "";
			naturalWidth = 0;
			naturalHeight = 0;

			constructor() {
				mockImageInstance = this;
			}
		}

		beforeEach(() => {
			vi.stubGlobal("Image", MockImage);
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("extracts image dimensions", async () => {
			const file = new File([""], "test.jpg", { type: "image/jpeg" });
			const promise = getSourceImageInfo(file);

			mockImageInstance.naturalWidth = 800;
			mockImageInstance.naturalHeight = 600;
			mockImageInstance.onload?.();

			const info = await promise;
			expect(info.width).toBe(800);
			expect(info.height).toBe(600);
			expect(info.orientation).toBe(1);
		});

		it("rejects with an error when image loading fails", async () => {
			const file = new File([""], "test.jpg", { type: "image/jpeg" });
			const promise = getSourceImageInfo(file);

			mockImageInstance.onerror?.();

			await expect(promise).rejects.toThrow("Failed to load image");
		});
	});
});
