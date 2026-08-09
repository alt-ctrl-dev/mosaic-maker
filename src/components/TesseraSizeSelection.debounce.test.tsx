import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

describe("TesseraSizeSelection debouncing", () => {
	const onSizeSelectedMock = vi.fn();

	const mockInitialState = {
		sourceImage: {
			url: "blob:test",
			width: 100,
			height: 100,
		},
		hasValidSourceDimensions: true,
	} as unknown as WorkflowState;

	beforeEach(() => {
		vi.useFakeTimers();
		onSizeSelectedMock.mockReset();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("debounces rapid slider changes to reduce callback calls", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		// Clear the initial mount call
		onSizeSelectedMock.mockClear();

		const rangeInput = screen.getByRole("slider");

		// Simulate rapid slider movements
		fireEvent.change(rangeInput, { target: { value: "20" } });
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		fireEvent.change(rangeInput, { target: { value: "35" } });

		// Should not have been called yet (debounced)
		expect(onSizeSelectedMock).not.toHaveBeenCalled();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should only have been called once with the final value
		expect(onSizeSelectedMock).toHaveBeenCalledTimes(1);
		expect(onSizeSelectedMock).toHaveBeenCalledWith(35);
	});

	it("delays callback execution during rapid slider changes", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		// Clear the initial mount call
		onSizeSelectedMock.mockClear();

		const rangeInput = screen.getByRole("slider");

		// First change should be debounced
		fireEvent.change(rangeInput, { target: { value: "20" } });

		// Should not have been called yet (debounced)
		expect(onSizeSelectedMock).not.toHaveBeenCalled();

		// Rapid subsequent changes should also be debounced
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });

		// Should still not have been called
		expect(onSizeSelectedMock).not.toHaveBeenCalled();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should have been called with the final value
		expect(onSizeSelectedMock).toHaveBeenCalledWith(30);
	});
});
