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

	it("renders a range input with min 2 and max based on source image dimensions", () => {
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

		expect(
			screen.getByText("16px", { selector: "strong" }),
		).toBeInTheDocument();
	});

	it("debounces onSizeSelected when the slider value changes", () => {
		vi.useFakeTimers();
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		// Clear the initial mount call
		onSizeSelectedMock.mockClear();

		const rangeInput = screen.getByRole("slider");
		fireEvent.change(rangeInput, { target: { value: "32" } });

		// Should not be called immediately (debounced)
		expect(onSizeSelectedMock).not.toHaveBeenCalled();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should be called after debounce
		expect(onSizeSelectedMock).toHaveBeenCalledWith(32);
		vi.useRealTimers();
	});
});
