import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createWorkflowStore,
	requestedTesseraSizeAtom,
} from "../atoms/workflow-atoms";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

describe("TesseraSizeSelection debouncing", () => {
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

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("debounces rapid slider changes to a single commit", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// Simulate rapid slider movements
		fireEvent.change(rangeInput, { target: { value: "20" } });
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });
		fireEvent.change(rangeInput, { target: { value: "35" } });

		// Should not have been committed yet (debounced)
		expect(store.get(requestedTesseraSizeAtom)).toBe(16);

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should have committed only the final value
		expect(store.get(requestedTesseraSizeAtom)).toBe(35);
	});

	it("delays the commit during rapid slider changes", () => {
		const { store } = renderSizeSelection();

		const rangeInput = screen.getByRole("slider");

		// First change should be debounced
		fireEvent.change(rangeInput, { target: { value: "20" } });

		// Should not have been committed yet (debounced)
		expect(store.get(requestedTesseraSizeAtom)).toBe(16);

		// Rapid subsequent changes should also be debounced
		fireEvent.change(rangeInput, { target: { value: "25" } });
		fireEvent.change(rangeInput, { target: { value: "30" } });

		// Should still not have been committed
		expect(store.get(requestedTesseraSizeAtom)).toBe(16);

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Should have committed the final value
		expect(store.get(requestedTesseraSizeAtom)).toBe(30);
	});
});
