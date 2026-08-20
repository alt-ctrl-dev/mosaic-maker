import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { GeneratedTesserae } from "./GeneratedTesserae";
import {
	INITIAL_WORKFLOW_STATE,
	type WorkflowState,
} from "../engine/workflow-state";
import { calculateGridCellCount } from "../engine/tessera-sizing";
import { getVarietyRecommendation } from "../engine/workflow-state";

function createMockStateWithGrid(
	width: number,
	height: number,
	tesseraSize: number,
): WorkflowState {
	const gridCellCount = calculateGridCellCount(tesseraSize, width, height);
	const varietyRecommendation = getVarietyRecommendation(gridCellCount);

	return {
		...INITIAL_WORKFLOW_STATE,
		sourceImage: {
			width,
			height,
			orientation: 1,
			url: "blob:test",
		},
		adjustedTesseraSize: tesseraSize,
		varietyRecommendation,
	};
}

test("initializes count to spec-recommended default when no explicit count is set", () => {
	const mockState = createMockStateWithGrid(100, 100, 10);

	render(
		<GeneratedTesserae
			onTesseraeGenerated={() => {}}
			initialState={mockState}
		/>,
	);

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("10");
});

test("uses explicit count when provided in state", () => {
	const mockState = {
		...createMockStateWithGrid(100, 100, 10),
		generatedTesseraCount: 25,
	};

	render(
		<GeneratedTesserae
			onTesseraeGenerated={() => {}}
			initialState={mockState}
		/>,
	);

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("25");
});

test("recommends 100 as max for large grid", () => {
	const mockState = createMockStateWithGrid(1000, 1000, 10);

	render(
		<GeneratedTesserae
			onTesseraeGenerated={() => {}}
			initialState={mockState}
		/>,
	);

	const countInput = screen.getByLabelText(
		"Number of tiles to generate",
	) as HTMLInputElement;
	expect(countInput.value).toBe("100");
});
