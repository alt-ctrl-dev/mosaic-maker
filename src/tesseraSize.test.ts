import { describe, it, expect } from "vitest";
import {
  calculateAdjustedTesseraSize,
  validateTesseraSize,
} from "./tesseraSize";

describe("Tessera Size Calculation", () => {
  it("should adjust tessera size to nearest valid divisor", () => {
    // For a 100x100 image, valid sizes are divisors of both dimensions
    expect(calculateAdjustedTesseraSize(50, 100, 100)).toBe(50); // exact divisor
    expect(calculateAdjustedTesseraSize(30, 100, 100)).toBe(25); // closer to 25 than 50
    expect(calculateAdjustedTesseraSize(40, 100, 100)).toBe(50); // equal distance, choose smaller
    expect(calculateAdjustedTesseraSize(45, 100, 100)).toBe(50); // closer to 50
  });

  it("should handle edge cases with minimum size", () => {
    // Image where all common divisors are below 8
    expect(validateTesseraSize(5, 11, 13)).toEqual({
      valid: false,
      reason:
        "No valid tessera size found that divides both dimensions and is at least 8px.",
    });
  });

  it("should calculate grid cells and detect coarse grids", () => {
    // For 100x100 image with 50px tesserae: 2x2 = 4 cells (coarse)
    expect(validateTesseraSize(50, 100, 100)).toEqual({
      valid: true,
      adjustedSize: 50,
      gridCells: 4,
      coarse: true,
      width: 100,
      height: 100,
    });

    // For 100x100 image with 10px tesserae: 10x10 = 100 cells (not coarse)
    expect(validateTesseraSize(10, 100, 100)).toEqual({
      valid: true,
      adjustedSize: 10,
      gridCells: 100,
      coarse: false,
      width: 100,
      height: 100,
    });
  });

  it("should reject images with no practical valid grid", () => {
    // Very small image that can't support 8px minimum
    expect(validateTesseraSize(10, 5, 5)).toEqual({
      valid: false,
      reason:
        "No valid tessera size found that divides both dimensions and is at least 8px.",
    });
  });
});
