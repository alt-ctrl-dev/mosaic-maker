import { describe, expect, it } from "vitest";
import { selectTessera, type ColorGrid } from "./mosaic-shared";

/**
 * An OKLab color grid where every cell is the same color, for controlled
 * distance calculations.
 */
function uniformGrid(L: number, a: number, b: number): ColorGrid {
	return {
		colors: [
			[
				{ L, a, b },
				{ L, a, b },
				{ L, a, b },
			],
			[
				{ L, a, b },
				{ L, a, b },
				{ L, a, b },
			],
			[
				{ L, a, b },
				{ L, a, b },
				{ L, a, b },
			],
		],
	};
}

describe("selectTessera", () => {
	const cellGrid = uniformGrid(0.5, 0, 0);

	it("returns the closest match when no neighbors exist", () => {
		const tesserae = [
			{ id: 0, grid: uniformGrid(0.5, 0, 0) },
			{ id: 1, grid: uniformGrid(0.55, 0, 0) },
			{ id: 2, grid: uniformGrid(0.7, 0, 0) },
			{ id: 3, grid: uniformGrid(0.9, 0, 0) },
		];

		const result = selectTessera(cellGrid, tesserae, (t) => t.grid, null, null);
		expect(result).toBe(0);
	});

	it("returns a non-neighbor when the closest match is a neighbor and an alternative is within tolerance", () => {
		// best distance d=0.005 (neighbor), alternative d'=0.0054 (non-neighbor).
		// d' ≤ d × 1.1 → 0.0054 ≤ 0.0055 → non-neighbor is preferred.
		const items = [
			{ id: 0, grid: uniformGrid(0.505, 0, 0) },
			{ id: 1, grid: uniformGrid(0.5054, 0, 0) },
		];

		const result = selectTessera(
			cellGrid,
			items,
			(t) => t.grid,
			0 /* neighborAbove */,
			null,
		);
		expect(result).toBe(1);
	});

	it("returns the neighbor when no non-neighbor is within tolerance", () => {
		const items = [
			{ id: 0, grid: uniformGrid(0.5, 0, 0) }, // best (neighbor)
			{ id: 1, grid: uniformGrid(0.7, 0, 0) }, // far (non-neighbor)
		];

		const result = selectTessera(
			cellGrid,
			items,
			(t) => t.grid,
			0 /* neighborAbove */,
			null,
		);

		// d=0, d'=0.2. 0.2 > 0 × 1.1 → neighbor wins.
		expect(result).toBe(0);
	});

	it("does not break early on a neighbor whose distance is below the threshold", () => {
		// Both distances are below DISTANCE_THRESHOLD (0.01). The neighbour
		// appears first; the early-termination guard must not skip the
		// non-neighbor that is within ALTERNATIVE_TOLERANCE.
		const target = uniformGrid(0.5, 0, 0);

		const items = [
			{ id: 0, grid: uniformGrid(0.5009, 0, 0) }, // d≈0.0009 (neighbor)
			{ id: 1, grid: uniformGrid(0.50097, 0, 0) }, // d≈0.00097 (non-neighbor)
		];

		// 0.00097 ≤ 0.0009 × 1.1 = 0.00099 → non-neighbor preferred.
		const result = selectTessera(
			target,
			items,
			(t) => t.grid,
			0 /* neighborAbove */,
			null,
		);
		expect(result).toBe(1);
	});

	it("returns a later non-neighbor that objectively beats an earlier neighbor", () => {
		// A neighbor at d=0.008 appears first, then a non-neighbor at d=0.005.
		// The non-neighbor is better and is not a neighbor → selected directly.
		const target = uniformGrid(0.5, 0, 0);

		const items = [
			{ id: 0, grid: uniformGrid(0.508, 0, 0) }, // neighbor, d=0.008
			{ id: 1, grid: uniformGrid(0.505, 0, 0) }, // non-neighbor, d=0.005
		];

		const result = selectTessera(
			target,
			items,
			(t) => t.grid,
			0 /* neighborAbove */,
			null,
		);
		expect(result).toBe(1);
	});

	it("selects deterministically — same result for multiple calls with same inputs", () => {
		const tesserae = [
			{ id: 0, grid: uniformGrid(0.5, 0, 0) },
			{ id: 1, grid: uniformGrid(0.55, 0, 0) },
		];

		for (let run = 0; run < 5; run++) {
			const result = selectTessera(
				cellGrid,
				tesserae,
				(t) => t.grid,
				null,
				null,
			);
			expect(result).toBe(0);
		}
	});

	it("breaks early on a non-neighbor below the threshold", () => {
		// A very close non-neighbor is found first; the early-termination is
		// safe because bestIndex is already a non-neighbor.
		const target = uniformGrid(0.5, 0, 0);

		const items = [
			{ id: 0, grid: uniformGrid(0.500001, 0, 0) }, // non-neighbor, far below threshold
			{ id: 1, grid: uniformGrid(0.9, 0, 0) }, // far, should never be reached
		];

		const result = selectTessera(target, items, (t) => t.grid, null, null);
		expect(result).toBe(0);
	});
});
