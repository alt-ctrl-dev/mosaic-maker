import { describe, expect, it } from "vitest";
import { generateMosaic } from "./mosaic-engine";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

function makeTessera(overrides: Partial<TesseraInfo> = {}): TesseraInfo {
  return {
    file: new File([], "test.jpg", { type: "image/jpeg" }),
    fileName: "test.jpg",
    isValid: true,
    error: null,
    isLowResolution: false,
    previewUrl: "data:image/png;base64,test",
    ...overrides,
  };
}

describe("Mosaic Engine", () => {
  it("should generate a mosaic with correct dimensions", async () => {
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      makeTessera({
        fileName: "test1.jpg",
        previewUrl: "data:image/png;base64,test1",
      }),
      makeTessera({
        fileName: "test2.jpg",
        previewUrl: "data:image/png;base64,test2",
      }),
    ];

    const tesseraSize = 8;

    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("should handle empty tesserae collection", async () => {
    const sourceImage: SourceImageInfo = {
      width: 8,
      height: 8,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [];
    const tesseraSize = 8;

    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
  });

  it("should handle single tesserae", async () => {
    const sourceImage: SourceImageInfo = {
      width: 8,
      height: 8,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [makeTessera({ fileName: "test1.jpg" })];

    const tesseraSize = 8;

    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
  });

  it("should validate tessera size inputs", async () => {
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [makeTessera()];

    await expect(generateMosaic(sourceImage, tesserae, 0)).rejects.toThrow(
      "Tessera size must be positive"
    );
    await expect(generateMosaic(sourceImage, tesserae, -5)).rejects.toThrow(
      "Tessera size must be positive"
    );
  });

  it("should validate source image dimensions", async () => {
    const sourceImage: SourceImageInfo = {
      width: 0,
      height: 0,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [makeTessera()];

    const tesseraSize = 8;

    await expect(
      generateMosaic(sourceImage, tesserae, tesseraSize)
    ).rejects.toThrow("Source image dimensions must be positive");
  });

  it("should filter out invalid tesserae", async () => {
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      makeTessera({
        fileName: "test1.jpg",
        previewUrl: "data:image/png;base64,valid1",
      }),
      makeTessera({
        fileName: "test2.jpg",
        isValid: false,
        error: "Invalid format",
        previewUrl: null,
      }),
      makeTessera({
        fileName: "test3.jpg",
        previewUrl: "data:image/png;base64,valid2",
      }),
    ];

    const tesseraSize = 8;

    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
    expect(result.dataUrl).toContain("2-valid-tesserae");
  });
});
