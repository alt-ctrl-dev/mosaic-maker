import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createWorkflowStore,
	requestedTesseraSizeAtom,
} from "../atoms/workflow-atoms";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

// The commit's observable side effect is resizing existing tiles.
vi.mock("../engine/tessera-processing", () => ({
	resizeTesserae: vi.fn().mockResolvedValue([]),
	processTesserae: vi.fn().mockResolvedValue([]),
}));

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

	beforeEach(async () => {
		vi.useFakeTimers();
		const { resizeTesserae } = await import("../engine/tessera-processing");
		vi.mocked(resizeTesserae).mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("updates the atom immediately but resizes tiles only once", async () => {
		const { resizeTesserae } = await import("../engine/tessera-processing");
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// Simulate rapid slider movements
		fireEvent.change(rangeInput, { target: { value: "20" } });
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		fireEvent.change(rangeInput, { target: { value: "35" } });

		// The draft lands in the atom straight away…
		expect(store.get(requestedTesseraSizeAtom)).toBe(35);
		// …but the commit side effect (tile resize) has not run yet.
		expect(resizeTesserae).not.toHaveBeenCalled();

		// Advance timers to allow the debounce to complete
		vi.advanceTimersByTime(300);

		// One resize after the final value
		expect(resizeTesserae).toHaveBeenCalledTimes(1);
		expect(resizeTesserae).toHaveBeenCalledWith([existingTessera], 35);
	});

	it("delays the resize during rapid slider changes", async () => {
		const { resizeTesserae } = await import("../engine/tessera-processing");
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// First change lands in the atom but the resize is debounced
		fireEvent.change(rangeInput, { target: { value: "20" } });
		expect(resizeTesserae).not.toHaveBeenCalled();

		// Rapid subsequent changes keep the resize pending
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		expect(resizeTesserae).not.toHaveBeenCalled();

		// Advance timers to allow the debounce to complete
		vi.advanceTimersByTime(300);

		// The resize ran once with the final value
		expect(store.get(requestedTesseraSizeAtom)).toBe(30);
		expect(resizeTesserae).toHaveBeenCalledTimes(1);
		expect(resizeTesserae).toHaveBeenCalledWith([existingTessera], 30);
	});
});
