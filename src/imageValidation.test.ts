import { describe, it, expect } from "vitest";
import { validateImageFile } from "./imageValidation";

describe("Image Validation", () => {
  it("should accept valid image types", () => {
    const jpegFile = new File([""], "test.jpg", { type: "image/jpeg" });
    const pngFile = new File([""], "test.png", { type: "image/png" });
    const webpFile = new File([""], "test.webp", { type: "image/webp" });

    expect(validateImageFile(jpegFile)).toEqual({ valid: true });
    expect(validateImageFile(pngFile)).toEqual({ valid: true });
    expect(validateImageFile(webpFile)).toEqual({ valid: true });
  });

  it("should reject invalid image types", () => {
    const gifFile = new File([""], "test.gif", { type: "image/gif" });
    const textFile = new File([""], "test.txt", { type: "text/plain" });

    expect(validateImageFile(gifFile)).toEqual({
      valid: false,
      reason:
        "Unsupported file type. Please select a JPEG, PNG, or WebP image.",
    });
    expect(validateImageFile(textFile)).toEqual({
      valid: false,
      reason:
        "Unsupported file type. Please select a JPEG, PNG, or WebP image.",
    });
  });
});
