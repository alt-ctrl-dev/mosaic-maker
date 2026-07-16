import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isSupportedImageFormat,
  getImageFileError,
  getSourceImageInfo,
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
      // @ts-ignore - intentionally creating a file with no type for testing
      const file = new File([""], "test.jpg");
      expect(getImageFileError(file)).toContain(
        "File type could not be determined"
      );
    });

    it("provides generic error for supported types that fail processing", () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      expect(getImageFileError(file)).toContain("could not be processed");
    });
  });

  describe("getSourceImageInfo", () => {
    // Mock the global Image class
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      naturalWidth = 0;
      naturalHeight = 0;

      constructor() {
        // Set up a way to trigger onload/onerror from tests
        (window as any).__mockImage = this;
      }
    }

    beforeEach(() => {
      vi.stubGlobal("Image", MockImage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      delete (window as any).__mockImage;
    });

    it("extracts image dimensions", async () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      const promise = getSourceImageInfo(file);

      // Simulate image loading successfully
      if (!(window as any).__mockImage) {
        throw new Error("Mock image not found");
      }
      const mockImage = (window as any).__mockImage;
      mockImage.naturalWidth = 800;
      mockImage.naturalHeight = 600;

      if (mockImage.onload) {
        mockImage.onload();
      }

      const info = await promise;
      expect(info.width).toBe(800);
      expect(info.height).toBe(600);
      expect(info.orientation).toBe(1);
    });

    it("rejects with an error when image loading fails", async () => {
      const file = new File([""], "test.jpg", { type: "image/jpeg" });
      const promise = getSourceImageInfo(file);

      // Simulate image loading failure
      if (!(window as any).__mockImage) {
        throw new Error("Mock image not found");
      }
      const mockImage = (window as any).__mockImage;
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      await expect(promise).rejects.toThrow("Failed to load image");
    });
  });
});
