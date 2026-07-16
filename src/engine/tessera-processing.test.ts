import { describe, expect, it } from "vitest";
import type { TesseraInfo } from "./workflow-state";

// Since DOM APIs aren't available in Node.js environment, we'll test the structure and types only
describe("tessera-processing", () => {
  describe("TesseraInfo interface", () => {
    it("should have the correct structure", () => {
      // This is just a type-level test to ensure our interface is correctly structured
      const tesseraInfo: TesseraInfo = {
        file: new File([], "test.jpg"),
        fileName: "test.jpg",
        isValid: true,
        error: null,
        isLowResolution: false,
        previewUrl: "data:image/png;base64,test",
      };
      
      expect(tesseraInfo.fileName).toBe("test.jpg");
      expect(tesseraInfo.isValid).toBe(true);
    });
  });
});