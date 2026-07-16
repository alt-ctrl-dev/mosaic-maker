import { describe, expect, it } from "vitest";
import { generateMosaic } from "./mosaic-engine";
import type { SourceImageInfo } from "./image-processing";
import type { TesseraInfo } from "./workflow-state";

describe("Mosaic Engine", () => {
  it("should generate a mosaic with correct dimensions", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      {
        file: new File([], "test1.jpg", { type: "image/jpeg" }),
        fileName: "test1.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test1",
      },
      {
        file: new File([], "test2.jpg", { type: "image/jpeg" }),
        fileName: "test2.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test2",
      },
    ];

    const tesseraSize = 8;

    // Act
    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    // Assert
    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("should handle empty tesserae collection", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 8,
      height: 8,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [];
    const tesseraSize = 8;

    // Act
    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    // Assert
    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
  });

  it("should handle single tesserae", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 8,
      height: 8,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      {
        file: new File([], "test1.jpg", { type: "image/jpeg" }),
        fileName: "test1.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test1",
      },
    ];

    const tesseraSize = 8;

    // Act
    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    // Assert
    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
  });

  it("should validate tessera size inputs", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      {
        file: new File([], "test1.jpg", { type: "image/jpeg" }),
        fileName: "test1.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test1",
      },
    ];

    // Act & Assert
    await expect(generateMosaic(sourceImage, tesserae, 0)).rejects.toThrow(
      "Tessera size must be positive"
    );
    await expect(generateMosaic(sourceImage, tesserae, -5)).rejects.toThrow(
      "Tessera size must be positive"
    );
  });

  it("should validate source image dimensions", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 0,
      height: 0,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      {
        file: new File([], "test1.jpg", { type: "image/jpeg" }),
        fileName: "test1.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test1",
      },
    ];

    const tesseraSize = 8;

    // Act & Assert
    await expect(
      generateMosaic(sourceImage, tesserae, tesseraSize)
    ).rejects.toThrow("Source image dimensions must be positive");
  });

  it("should filter out invalid tesserae", async () => {
    // Arrange
    const sourceImage: SourceImageInfo = {
      width: 16,
      height: 16,
      orientation: 1,
    };

    const tesserae: TesseraInfo[] = [
      {
        file: new File([], "test1.jpg", { type: "image/jpeg" }),
        fileName: "test1.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,valid1",
      },
      {
        file: new File([], "test2.jpg", { type: "image/jpeg" }),
        fileName: "test2.jpg",
        isValid: false,
        error: "Invalid format",
        isLowResolution: false,
        previewUrl: null,
      },
      {
        file: new File([], "test3.jpg", { type: "image/jpeg" }),
        fileName: "test3.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,valid2",
      },
    ];

    const tesseraSize = 8;

    // Act
    const result = await generateMosaic(sourceImage, tesserae, tesseraSize);

    // Assert
    expect(result).toBeDefined();
    expect(result.width).toBe(sourceImage.width);
    expect(result.height).toBe(sourceImage.height);
    // The result should reflect that only 2 tesserae are valid
    expect(result.dataUrl).toContain("2-valid-tesserae");
  });
});
