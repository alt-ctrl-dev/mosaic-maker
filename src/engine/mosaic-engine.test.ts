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
  });
});
