import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

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

	afterEach(() => {
		cleanup();
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
		expect(rangeInput.getAttribute("value")).toBe("16");
	});

	it("displays the current size value", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		expect(screen.getByText("16px")).toBeInTheDocument();
	});

	it("calls onSizeSelected when the slider value changes", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		fireEvent.change(rangeInput, { target: { value: "32" } });

		expect(onSizeSelectedMock).toHaveBeenCalledWith(32);
	});
});
