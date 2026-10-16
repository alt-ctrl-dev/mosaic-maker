import { describe, expect, it } from "vitest";
import { overlayGridFor } from "./GenerateAndPreview";

describe("overlayGridFor", () => {
	it("mirrors the mosaic grid for the chosen tile size", () => {
		// 100 × 100 source with 10 px tiles → a 10 × 10 grid.
		expect(overlayGridFor(100, 100, 10)).toEqual({ cols: 10, rows: 10 });
	});

	it("uses ceil for partial tiles", () => {
		// 105 × 55 source with 50 px tiles → 3 × 2 grid.
		expect(overlayGridFor(105, 55, 50)).toEqual({ cols: 3, rows: 2 });
	});

	it("keeps at least one cell per axis", () => {
		expect(overlayGridFor(5, 5, 50)).toEqual({ cols: 1, rows: 1 });
	});

	it("scales large grids down to a renderable cell count", () => {
		// 4160 × 6240 source with 16 px tiles is 260 × 390 = 101,400 cells.
		const { cols, rows } = overlayGridFor(4160, 6240, 16);
		expect(cols * rows).toBeLessThanOrEqual(2500);
		// Aspect ratio is preserved (260/390 ≈ 2/3).
		expect(cols / rows).toBeCloseTo(260 / 390, 1);
	});
});
