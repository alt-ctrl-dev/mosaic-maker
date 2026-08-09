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

describe("TesseraSizeSelection - Resize uploaded tesserae", () => {
	const onSizeSelectedMock = vi.fn();

	beforeEach(() => {
		onSizeSelectedMock.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	it("should call onSizeSelected when slider changes", () => {
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
