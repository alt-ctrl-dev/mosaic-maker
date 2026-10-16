import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { calculateGridCellCount } from "../engine/tessera-sizing";
import { getVarietyRecommendation } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { GeneratedTesserae } from "./GeneratedTesserae";

function createGridState(width: number, height: number, tesseraSize: number) {
	const gridCellCount = calculateGridCellCount(tesseraSize, width, height);
	const varietyRecommendation = getVarietyRecommendation(gridCellCount);

	return {
		sourceImage: {
			width,
			height,
			orientation: 1,
			url: "blob:test",
		},
		requestedTesseraSize: tesseraSize,
		adjustedTesseraSize: tesseraSize,
		varietyRecommendation,
	};
}

test("initializes count to spec-recommended default when no explicit count is set", () => {
	renderWithWorkflow(<GeneratedTesserae />, createGridState(100, 100, 10));

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("10");
});

test("uses explicit count when provided in state", () => {
	renderWithWorkflow(<GeneratedTesserae />, {
		...createGridState(100, 100, 10),
		generatedTesseraCount: 25,
	});

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("25");
});

test("recommends 100 as max for large grid", () => {
	renderWithWorkflow(<GeneratedTesserae />, createGridState(1000, 1000, 10));

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("100");
});
