import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createWorkflowStore,
	requestedTesseraSizeAtom,
} from "../atoms/workflow-atoms";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

describe("TesseraSizeSelection initial value registration", () => {
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

	afterEach(() => {
		cleanup();
	});

	it("commits the default size on initial render", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");
		expect(rangeInput.getAttribute("value")).toBe("16");

		expect(store.get(requestedTesseraSizeAtom)).toBe(16);
	});

	it("debounces the size commit when user changes slider value", () => {
		vi.useFakeTimers();
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		fireEvent.change(rangeInput, { target: { value: "32" } });

		// Should not be committed immediately (debounced)
		expect(store.get(requestedTesseraSizeAtom)).toBe(16);

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should be committed after debounce
		expect(store.get(requestedTesseraSizeAtom)).toBe(32);
		vi.useRealTimers();
	});
});
