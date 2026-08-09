import { describe, expect, it } from "vitest";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
	isCoarseGrid,
} from "./tessera-sizing";

describe("tessera-sizing", () => {
	describe("calculateAdjustedTesseraSize", () => {
		it("returns the exact requested size when it is within valid range", () => {
			expect(calculateAdjustedTesseraSize(10, 100, 100)).toBe(10);
		});

		it("clamps to minimum when requested size is below minimum", () => {
			expect(calculateAdjustedTesseraSize(5, 100, 100)).toBe(8); // MIN_TESSERA_SIZE
		});

		it("clamps to maximum when requested size exceeds minimum dimension", () => {
			expect(calculateAdjustedTesseraSize(150, 100, 100)).toBe(100);
			expect(calculateAdjustedTesseraSize(150, 100, 50)).toBe(50);
		});

		it("respects the minimum tessera size of 8", () => {
			expect(calculateAdjustedTesseraSize(1, 16, 16)).toBe(8);
		});

		it("works with non-square images", () => {
			// 200x100: requested 30 is within range [8, 100], so returns 30
			expect(calculateAdjustedTesseraSize(30, 200, 100)).toBe(30);
		});
	});

	describe("calculateGridCellCount", () => {
		it("calculates the correct number of grid cells with exact division", () => {
			expect(calculateGridCellCount(10, 100, 100)).toBe(100);
			expect(calculateGridCellCount(10, 200, 100)).toBe(200);
		});

		it("calculates the correct number of grid cells with partial edge cells", () => {
			// 476 x 600 with tessera size 10
			// Grid should be ceil(476/10) x ceil(600/10) = 48 x 60 = 2880 cells
			expect(calculateGridCellCount(10, 476, 600)).toBe(2880);
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
		it("returns true for images with valid dimensions", () => {
			expect(hasValidTesseraSizes(100, 100)).toBe(true);
			expect(hasValidTesseraSizes(476, 600)).toBe(true); // Issue example
		});

		it("returns false for images with dimensions less than minimum", () => {
			expect(hasValidTesseraSizes(5, 100)).toBe(false);
			expect(hasValidTesseraSizes(100, 5)).toBe(false);
			expect(hasValidTesseraSizes(5, 5)).toBe(false);
		});
	});
});
