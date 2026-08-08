import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

// Mock the workflow state
const mockInitialState = {
	sourceImage: {
		url: "blob:test",
		width: 100,
		height: 100,
	},
	hasValidSourceDimensions: true,
} as unknown as WorkflowState;

describe("TesseraSizeSelection", () => {
	const onSizeSelectedMock = vi.fn();

	beforeEach(() => {
		onSizeSelectedMock.mockReset();
	});

	it("renders a range input with min 2 and max 100", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("type")).toBe("range");
		expect(rangeInput.getAttribute("min")).toBe("2");
		expect(rangeInput.getAttribute("max")).toBe("100");
		expect(rangeInput.getAttribute("value")).toBe("16"); // Default value
	});

	it("displays the current size value", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		expect(screen.getAllByText("16px").length).toBeGreaterThan(0);
	});

	it("does not render the Confirm Size button", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const confirmButton = screen.queryByText("Confirm Size");
		expect(confirmButton).toBeNull();
	});
});
