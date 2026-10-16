import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("TesseraSizeSelection initial value registration", () => {
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

	afterEach(() => {
		cleanup();
	});

	it("exposes the default size from the start", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("value")).toBe("16");

		expect(store.get(requestedTesseraSizeAtom)).toBe(16);
	});

	it("debounces the size commit when user changes slider value", async () => {
		const { resizeTesserae } = await import("../engine/tessera-processing");
		vi.mocked(resizeTesserae).mockClear();
		vi.useFakeTimers();
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		fireEvent.change(rangeInput, { target: { value: "32" } });

		// The draft lands in the atom immediately…
		expect(store.get(requestedTesseraSizeAtom)).toBe(32);
		// …but the commit side effect waits for the debounce.
		expect(resizeTesserae).not.toHaveBeenCalled();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Committed after debounce
		expect(resizeTesserae).toHaveBeenCalledTimes(1);
		expect(resizeTesserae).toHaveBeenCalledWith([existingTessera], 32);
		vi.useRealTimers();
	});
});
