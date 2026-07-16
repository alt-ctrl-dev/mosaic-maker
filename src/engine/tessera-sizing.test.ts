import { describe, expect, it } from "vitest";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
	isCoarseGrid,
} from "./tessera-sizing";

describe("tessera-sizing", () => {
	describe("calculateAdjustedTesseraSize", () => {
		it("returns the exact requested size when it divides both dimensions", () => {
			expect(calculateAdjustedTesseraSize(10, 100, 100)).toBe(10);
		});

		it("adjusts to the nearest valid size when requested size is invalid", () => {
			expect(calculateAdjustedTesseraSize(15, 100, 100)).toBe(10);
		});

		it("breaks ties by choosing the smaller valid size", () => {
			expect(calculateAdjustedTesseraSize(15, 100, 100)).toBe(10);
			expect(calculateAdjustedTesseraSize(11, 60, 60)).toBe(10);
		});

		it("returns null when no valid sizes exist above minimum", () => {
			expect(calculateAdjustedTesseraSize(10, 11, 13)).toBeNull();
		});

		it("respects the minimum tessera size of 8", () => {
			expect(calculateAdjustedTesseraSize(5, 16, 16)).toBe(8);
		});

		it("works with non-square images", () => {
			// 200x100: valid sizes >= 8 are 10, 20, 25, 50, 100. 30 is closest to 25.
			expect(calculateAdjustedTesseraSize(30, 200, 100)).toBe(25);
		});
	});

	describe("calculateGridCellCount", () => {
		it("calculates the correct number of grid cells", () => {
			expect(calculateGridCellCount(10, 100, 100)).toBe(100);
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
			expect(hasValidTesseraSizes(100, 100)).toBe(true);
		});

		it("returns false for images with no valid tessera sizes", () => {
			expect(hasValidTesseraSizes(11, 13)).toBe(false);
		});

		it("returns true for images with minimum valid tessera size", () => {
			expect(hasValidTesseraSizes(16, 16)).toBe(true);
		});
	});
});
