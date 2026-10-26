import { describe, expect, it } from "vitest";
import {
	PACKED_GRID_LENGTH,
	splitIntoBands,
	unpackColorGrid,
} from "./source-sampling";

describe("splitIntoBands", () => {
	it("covers every grid row once and clips the last band to the image", () => {
		// 105px tall at 10px tiles = 11 rows, the last one partial.
		const bands = splitIntoBands(105, 10, 3);
		expect(bands).toEqual([
			{ y: 0, height: 40, rows: 4 },
			{ y: 40, height: 40, rows: 4 },
			{ y: 80, height: 25, rows: 3 },
		]);
	});

	it("never creates more bands than grid rows", () => {
		expect(splitIntoBands(20, 10, 8)).toHaveLength(2);
	});
});

describe("unpackColorGrid", () => {
	it("reads the cell at the given index", () => {
		const packed = new Float64Array(PACKED_GRID_LENGTH * 2);
		packed[PACKED_GRID_LENGTH] = 0.5;
		packed[PACKED_GRID_LENGTH + 2] = -0.25;
		const grid = unpackColorGrid(packed, 1);
		expect(grid.colors).toHaveLength(3);
		expect(grid.colors[0][0]).toEqual({ L: 0.5, a: 0, b: -0.25 });
	});
});
