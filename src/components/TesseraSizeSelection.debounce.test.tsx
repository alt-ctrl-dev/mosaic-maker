import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createWorkflowStore,
	requestedTesseraSizeAtom,
	tesseraeAtom,
} from "../atoms/workflow-atoms";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

const existingTessera = {
	file: new File([], "tile.png", { type: "image/png" }),
	fileName: "tile.png",
	isValid: true,
	error: null,
	isLowResolution: false,
	previewUrl: null,
};

describe("TesseraSizeSelection debouncing", () => {
	const mockInitialState = {
		sourceImage: {
			url: "blob:test",
			width: 100,
			height: 100,
			orientation: 1,
		},
		tesserae: [existingTessera],
	};

	function renderSizeSelection() {
		const store = createWorkflowStore(mockInitialState);
		const result = render(
			<Provider store={store}>
				<TesseraSizeSelection />
			</Provider>,
		);
		return { store, ...result };
	}

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("updates the atom immediately but clears tiles only once", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// Simulate rapid slider movements
		fireEvent.change(rangeInput, { target: { value: "20" } });
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		fireEvent.change(rangeInput, { target: { value: "35" } });

		// The draft lands in the atom straight away…
		expect(store.get(requestedTesseraSizeAtom)).toBe(35);
		// …but the commit side effect (tile clear) has not run yet.
		expect(store.get(tesseraeAtom)).toHaveLength(1);

		// Advance timers to allow the debounce to complete
		vi.advanceTimersByTime(300);

		// Tiles cleared once after the final value
		expect(store.get(requestedTesseraSizeAtom)).toBe(35);
		expect(store.get(tesseraeAtom)).toHaveLength(0);
	});

	it("delays the clear during rapid slider changes", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// First change lands in the atom but the clear is debounced
		fireEvent.change(rangeInput, { target: { value: "20" } });
		expect(store.get(tesseraeAtom)).toHaveLength(1);

		// Rapid subsequent changes keep the clear pending
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		expect(store.get(tesseraeAtom)).toHaveLength(1);

		// Advance timers to allow the debounce to complete
		vi.advanceTimersByTime(300);

		// The clear ran once with the final value
		expect(store.get(requestedTesseraSizeAtom)).toBe(30);
		expect(store.get(tesseraeAtom)).toHaveLength(0);
	});
});
