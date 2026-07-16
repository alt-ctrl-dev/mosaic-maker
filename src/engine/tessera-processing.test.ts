import { describe, expect, it } from "vitest";
import type { TesseraInfo } from "./workflow-state";

describe("TesseraInfo", () => {
  it("accepts valid tessera shape", () => {
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
