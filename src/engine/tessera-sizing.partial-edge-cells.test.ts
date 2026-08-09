import { describe, expect, it } from "vitest";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	hasValidTesseraSizes,
} from "./tessera-sizing";

describe("tessera-sizing with partial edge cells", () => {
	describe("hasValidTesseraSizes", () => {
		it("returns true for images with minimum valid tessera size of 8", () => {
			// 476 x 600 example from the issue - gcd(476, 600) = 4, so no common divisors >= 8
			// But with partial edge cells, any size from 8 to min(476, 600) should be valid
			expect(hasValidTesseraSizes(476, 600)).toBe(true);
		});

		it("returns false for images with dimensions less than 8", () => {
			expect(hasValidTesseraSizes(5, 100)).toBe(false);
			expect(hasValidTesseraSizes(100, 5)).toBe(false);
			expect(hasValidTesseraSizes(5, 5)).toBe(false);
		});
	});

	describe("calculateAdjustedTesseraSize", () => {
		it("clamps requested size to valid range for images without common divisors", () => {
			// 476 x 600 example - no common divisors >= 8, but we should accept any size 8-476
			expect(calculateAdjustedTesseraSize(10, 476, 600)).toBe(10);
			expect(calculateAdjustedTesseraSize(5, 476, 600)).toBe(8); // Clamped to minimum
			expect(calculateAdjustedTesseraSize(500, 476, 600)).toBe(476); // Clamped to maximum
		});

		it("clamps requested size to valid range for images with common divisors too", () => {
			// 100 x 100 has many common divisors, but we still just clamp
			expect(calculateAdjustedTesseraSize(10, 100, 100)).toBe(10);
			expect(calculateAdjustedTesseraSize(15, 100, 100)).toBe(15); // No adjustment needed, in range
		});
	});

	describe("calculateGridCellCount", () => {
		it("calculates grid cell count using ceiling division for partial edge cells", () => {
			// 476 x 600 with tessera size 10
			// Grid should be ceil(476/10) x ceil(600/10) = 48 x 60 = 2880 cells
			expect(calculateGridCellCount(10, 476, 600)).toBe(2880);

			// Exact division case
			expect(calculateGridCellCount(10, 100, 100)).toBe(100);
		});
	});
});
