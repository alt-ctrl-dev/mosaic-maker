import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

describe("TesseraSizeSelection initial value registration", () => {
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
		onSizeSelectedMock.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("calls onSizeSelected on initial render with default value", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("value")).toBe("16");

		expect(onSizeSelectedMock).toHaveBeenCalledTimes(1);
		expect(onSizeSelectedMock).toHaveBeenCalledWith(16);
	});

	it("debounces onSizeSelected when user changes slider value", () => {
		vi.useFakeTimers();
		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		onSizeSelectedMock.mockClear();

		fireEvent.change(rangeInput, { target: { value: "32" } });

		// Should not be called immediately (debounced)
		expect(onSizeSelectedMock).not.toHaveBeenCalled();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should be called after debounce
		expect(onSizeSelectedMock).toHaveBeenCalledTimes(1);
		expect(onSizeSelectedMock).toHaveBeenCalledWith(32);
		vi.useRealTimers();
	});
});
