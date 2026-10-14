import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MAX_FILE_SIZE_BYTES,
	MAX_TOTAL_RETAINED_BYTES,
	MAX_DECODED_PIXELS,
	MAX_AXIS_PIXELS,
	isFileSizeExceeded,
	isTotalRetainedSizeExceeded,
	isTesseraFileLimitExceeded,
	isDimensionLimitExceeded,
	getImageDimensions,
	getFileSizeErrorMessage,
	getTotalSizeErrorMessage,
	getFileCountErrorMessage,
	getDimensionErrorMessage,
} from "./resource-policy";

describe("resource-policy", () => {
	describe("isFileSizeExceeded", () => {
		it("returns false for files under the limit", () => {
			const file = new File(["a".repeat(1000)], "test.jpg");
			expect(isFileSizeExceeded(file)).toBe(false);
		});

		it("returns false for files exactly at the limit", () => {
			const file = new File(["a".repeat(MAX_FILE_SIZE_BYTES)], "test.jpg");
			expect(isFileSizeExceeded(file)).toBe(false);
		});

		it("returns true for files over the limit", () => {
			const file = new File(["a".repeat(MAX_FILE_SIZE_BYTES + 1)], "test.jpg");
			expect(isFileSizeExceeded(file)).toBe(true);
		});
	});

	describe("isTotalRetainedSizeExceeded", () => {
		it("returns false when total size is under the limit", () => {
			const currentFiles = [new File(["a".repeat(1000)], "test1.jpg")];
			const newFiles = [new File(["a".repeat(1000)], "test2.jpg")];
			expect(isTotalRetainedSizeExceeded(currentFiles, newFiles)).toBe(false);
		});

		it("returns false when total size is exactly at the limit", () => {
			const currentFiles = [new File(["a".repeat(1000)], "test1.jpg")];
			const newFiles = [
				new File(["a".repeat(MAX_TOTAL_RETAINED_BYTES - 1000)], "test2.jpg"),
			];
			expect(isTotalRetainedSizeExceeded(currentFiles, newFiles)).toBe(false);
		});

		it("returns true when total size exceeds the limit", () => {
			const currentFiles = [new File(["a".repeat(1000)], "test1.jpg")];
			const newFiles = [
				new File(["a".repeat(MAX_TOTAL_RETAINED_BYTES)], "test2.jpg"),
			];
			expect(isTotalRetainedSizeExceeded(currentFiles, newFiles)).toBe(true);
		});

		it("handles undefined files in current files array", () => {
			const currentFiles = [
				undefined,
				new File(["a".repeat(1000)], "test1.jpg"),
			];
			const newFiles = [new File(["a".repeat(1000)], "test2.jpg")];
			expect(isTotalRetainedSizeExceeded(currentFiles, newFiles)).toBe(false);
		});
	});

	describe("isTesseraFileLimitExceeded", () => {
		it("returns false when file count is under the limit", () => {
			expect(isTesseraFileLimitExceeded(100, 100)).toBe(false);
		});

		it("returns false when file count is exactly at the limit", () => {
			expect(isTesseraFileLimitExceeded(250, 250)).toBe(false);
		});

		it("returns true when file count exceeds the limit", () => {
			expect(isTesseraFileLimitExceeded(300, 250)).toBe(true);
		});
	});

	describe("isDimensionLimitExceeded", () => {
		it("returns false for dimensions under the limit", () => {
			expect(isDimensionLimitExceeded(1000, 1000)).toBe(false);
		});

		it("returns false for dimensions exactly at the axis limit", () => {
			expect(isDimensionLimitExceeded(MAX_AXIS_PIXELS, 1000)).toBe(false);
			expect(isDimensionLimitExceeded(1000, MAX_AXIS_PIXELS)).toBe(false);
		});

		it("returns false for dimensions exactly at the pixel limit", () => {
			const size = Math.floor(Math.sqrt(MAX_DECODED_PIXELS));
			expect(isDimensionLimitExceeded(size, size)).toBe(false);
		});

		it("returns true for dimensions exceeding axis limit", () => {
			expect(isDimensionLimitExceeded(MAX_AXIS_PIXELS + 1, 1000)).toBe(true);
			expect(isDimensionLimitExceeded(1000, MAX_AXIS_PIXELS + 1)).toBe(true);
		});

		it("returns true for dimensions exceeding pixel limit", () => {
			expect(isDimensionLimitExceeded(7000, 7000)).toBe(true); // 49M pixels
		});
	});

	describe("getErrorMessages", () => {
		it("provides appropriate file size error message", () => {
			const message = getFileSizeErrorMessage("test.jpg");
			expect(message).toContain("too large");
			expect(message).toContain("25.0 MiB maximum");
		});

		it("provides appropriate total size error message", () => {
			const message = getTotalSizeErrorMessage();
			expect(message).toContain("250.0 MiB");
		});

		it("provides appropriate file count error message", () => {
			const message = getFileCountErrorMessage();
			expect(message).toContain("500");
		});

		it("provides appropriate dimension error message for axis limit", () => {
			const message = getDimensionErrorMessage(MAX_AXIS_PIXELS + 1, 1000);
			expect(message).toContain("dimensions too large");
			expect(message).toContain("16384 pixels maximum on either axis");
		});

		it("provides appropriate dimension error message for pixel limit", () => {
			const message = getDimensionErrorMessage(7000, 7000);
			expect(message).toContain("too many pixels");
			expect(message).toContain("40,000,000 maximum");
		});
	});

	describe("getImageDimensions", () => {
		let mockImage: {
			onload: (() => void) | null;
			onerror: (() => void) | null;
			src: string;
			naturalWidth: number;
			naturalHeight: number;
		};

		const mockCreateObjectURL = vi.fn(() => "blob:test");
		const mockRevokeObjectURL = vi.fn();

		beforeEach(() => {
			vi.stubGlobal("Image", function MockImage(this: typeof mockImage) {
				this.onload = null;
				this.onerror = null;
				this.src = "";
				this.naturalWidth = 0;
				this.naturalHeight = 0;
				mockImage = this;
			});
			vi.stubGlobal("URL", {
				createObjectURL: mockCreateObjectURL,
				revokeObjectURL: mockRevokeObjectURL,
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			mockCreateObjectURL.mockClear();
			mockRevokeObjectURL.mockClear();
		});

		it("returns the file's decoded dimensions", async () => {
			const file = new File(["fake"], "test.png", { type: "image/png" });
			const promise = getImageDimensions(file);

			mockImage.naturalWidth = 1920;
			mockImage.naturalHeight = 1080;
			mockImage.onload?.();

			const dims = await promise;
			expect(dims).toEqual({ width: 1920, height: 1080 });
			expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
			expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test");
		});

		it("rejects when the image cannot be decoded", async () => {
			const file = new File(["fake"], "corrupt.png", {
				type: "image/png",
			});
			const promise = getImageDimensions(file);

			mockImage.onerror?.();

			await expect(promise).rejects.toThrow(
				"Failed to decode image: corrupt.png",
			);
		});

		it("revokes object URL on successful decode", async () => {
			const file = new File(["fake"], "test.png", { type: "image/png" });
			const promise = getImageDimensions(file);

			mockImage.naturalWidth = 100;
			mockImage.naturalHeight = 100;
			mockImage.onload?.();

			await promise;
			expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test");
		});

		it("revokes object URL on decode failure", async () => {
			const file = new File(["fake"], "corrupt.png", {
				type: "image/png",
			});
			const promise = getImageDimensions(file);

			mockImage.onerror?.();

			await expect(promise).rejects.toThrow();
			expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test");
		});
	});
});
