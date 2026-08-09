import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import type { WorkflowState } from "../engine/workflow-state";

describe("TesseraSizeSelection with dynamic max", () => {
	const onSizeSelectedMock = vi.fn();

	beforeEach(() => {
		onSizeSelectedMock.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("sets the max value based on the smaller source image dimension", () => {
		const mockInitialState = {
			sourceImage: {
				url: "blob:test",
				width: 476,
				height: 600,
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
		expect(rangeInput.getAttribute("max")).toBe("476"); // min(476, 600)
	});

	it("updates the max value when source image dimensions change", () => {
		const { rerender } = render(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={
					{
						sourceImage: {
							url: "blob:test",
							width: 100,
							height: 100,
						},
						hasValidSourceDimensions: true,
					} as unknown as WorkflowState
				}
			/>,
		);

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("max")).toBe("100");

		// Re-render with different dimensions
		rerender(
			<TesseraSizeSelection
				onSizeSelected={onSizeSelectedMock}
				initialState={
					{
						sourceImage: {
							url: "blob:test",
							width: 200,
							height: 150,
						},
						hasValidSourceDimensions: true,
					} as unknown as WorkflowState
				}
			/>,
		);

		expect(rangeInput.getAttribute("max")).toBe("150"); // min(200, 150)
	});

	it("allows selecting sizes up to the dynamic maximum", () => {
		const mockInitialState = {
			sourceImage: {
				url: "blob:test",
				width: 200,
				height: 150,
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

		// Try setting to the maximum allowed value
		fireEvent.change(rangeInput, { target: { value: "150" } });
		expect(onSizeSelectedMock).toHaveBeenCalledWith(150);
	});
});
