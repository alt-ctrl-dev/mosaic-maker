import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createWorkflowStore,
	requestedTesseraSizeAtom,
} from "../atoms/workflow-atoms";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

const mockInitialState = {
	sourceImage: {
		url: "blob:test",
		width: 100,
		height: 100,
		orientation: 1,
	},
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

describe("TesseraSizeSelection", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders a range input with min 8 and a source-derived max", () => {
		renderSizeSelection();

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("type")).toBe("range");
		expect(rangeInput.getAttribute("min")).toBe("8");
		// Ceiling is the source image's short side (100 × 100 fixture).
		expect(rangeInput.getAttribute("max")).toBe("100");
		expect(rangeInput.getAttribute("value")).toBe("16");
	});

	it("displays the current size value", () => {
		renderSizeSelection();

		expect(
			screen.getByText("16px", { selector: "strong" }),
		).toBeInTheDocument();
	});

	it("debounces the size commit when the slider value changes", () => {
		vi.useFakeTimers();
		const { store } = renderSizeSelection();

		// Clear the initial mount commit
		store.set(requestedTesseraSizeAtom, null);

		const rangeInput = screen.getByRole("slider");
		fireEvent.change(rangeInput, { target: { value: "32" } });

		// Should not be committed immediately (debounced)
		expect(store.get(requestedTesseraSizeAtom)).toBeNull();

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should be committed after debounce
		expect(store.get(requestedTesseraSizeAtom)).toBe(32);
		vi.useRealTimers();
	});
});
