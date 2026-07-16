import { describe, expect, it } from "vitest";
import {
  calculateAdjustedTesseraSize,
  calculateGridCellCount,
  isCoarseGrid,
  hasValidTesseraSizes,
} from "./tessera-sizing";

describe("tessera-sizing", () => {
  describe("calculateAdjustedTesseraSize", () => {
    it("returns the exact requested size when it divides both dimensions", () => {
      // 100x100 image, 10 is a valid size (100/10 = 10, both integers)
      expect(calculateAdjustedTesseraSize(10, 100, 100)).toBe(10);
    });

    it("adjusts to the nearest valid size when requested size is invalid", () => {
      // 100x100 image, 15 is not a valid size
      // Valid sizes: 10, 20, 25, 50, 100
      // 15 is closer to 10 than to 20, so should choose 10
      expect(calculateAdjustedTesseraSize(15, 100, 100)).toBe(10);
    });

    it("breaks ties by choosing the smaller valid size", () => {
      // 100x100 image, 15 is equidistant from 10 and 20
      // Should choose 10 (smaller)
      expect(calculateAdjustedTesseraSize(15, 100, 100)).toBe(10);

      // 60x60 image, 20 is equidistant from 15 and 30
      // Should choose 15 (smaller)
      expect(calculateAdjustedTesseraSize(20, 60, 60)).toBe(15);
    });

    it("returns null when no valid sizes exist above minimum", () => {
      // Prime number dimensions with no common divisors above 8
      expect(calculateAdjustedTesseraSize(10, 11, 13)).toBeNull();
    });

    it("respects the minimum tessera size of 8", () => {
      // For a 16x16 image, valid sizes are 8 and 16
      // Requesting 5 should adjust to 8 (minimum)
      expect(calculateAdjustedTesseraSize(5, 16, 16)).toBe(8);
    });

    it("works with non-square images", () => {
      // 200x100 image
      // Valid sizes: divisors of both 200 and 100
      // 100: 200/100=2, 100/100=1 - valid
      // 50: 200/50=4, 100/50=2 - valid
      // 25: 200/25=8, 100/25=4 - valid
      // 20: 200/20=10, 100/20=5 - valid
      // 10: 200/10=20, 100/10=10 - valid
      // 8: 200/8=25, 100/8=12.5 - not valid!

      // Actually, 8 is not valid for 100 (100/8 = 12.5)
      // Valid sizes >= 8: 10, 20, 25, 50, 100
      expect(calculateAdjustedTesseraSize(30, 200, 100)).toBe(25);
    });
  });

  describe("calculateGridCellCount", () => {
    it("calculates the correct number of grid cells", () => {
      // 100x100 image with 10px tesserae = 10x10 grid = 100 cells
      expect(calculateGridCellCount(10, 100, 100)).toBe(100);

      // 200x100 image with 10px tesserae = 20x10 grid = 200 cells
      expect(calculateGridCellCount(10, 200, 100)).toBe(200);
    });
  });

  describe("isCoarseGrid", () => {
    it("returns true for grids with fewer than 100 cells", () => {
      expect(isCoarseGrid(99)).toBe(true);
    });

    it("returns false for grids with 100 or more cells", () => {
      expect(isCoarseGrid(100)).toBe(false);
      expect(isCoarseGrid(1000)).toBe(false);
    });
  });

  describe("hasValidTesseraSizes", () => {
    it("returns true for images with valid tessera sizes", () => {
      // 100x100 has divisors: 10, 20, 25, 50, 100 (all above 8)
      expect(hasValidTesseraSizes(100, 100)).toBe(true);
    });

    it("returns false for images with no valid tessera sizes", () => {
      // Prime numbers with no common divisors above 8
      expect(hasValidTesseraSizes(11, 13)).toBe(false);
    });

    it("returns true for images with minimum valid tessera size", () => {
      // 16x16 has divisors: 8, 16 (8 is the minimum)
      expect(hasValidTesseraSizes(16, 16)).toBe(true);
    });
  });
});
