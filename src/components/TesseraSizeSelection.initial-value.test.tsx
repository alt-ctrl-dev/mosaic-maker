import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

describe("TesseraSizeSelection initial value registration", () => {
	const onSizeSelectedMock = vi.fn();

	beforeEach(() => {
		onSizeSelectedMock.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("calls onSizeSelected on initial render with default value", () => {
		const mockInitialState = {
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
			},
			hasValidSourceDimensions: true,
		} as unknown as WorkflowState;

		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		// The default value of 16 should be displayed
		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("value")).toBe("16");

		// onSizeSelected should be called with the default value
		expect(onSizeSelectedMock).toHaveBeenCalledWith(16);
	});

	it("calls onSizeSelected when user changes slider value", () => {
		const mockInitialState = {
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
			},
			hasValidSourceDimensions: true,
		} as unknown as WorkflowState;

		render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={mockInitialState}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		// Reset the mock to ignore the initial call
		onSizeSelectedMock.mockReset();

		// Simulate user changing the slider to 32
		fireEvent.change(rangeInput, { target: { value: "32" } });

		// onSizeSelected should be called with the new value
		expect(onSizeSelectedMock).toHaveBeenCalledWith(32);
	});
});
