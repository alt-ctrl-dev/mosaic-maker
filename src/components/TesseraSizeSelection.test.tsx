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

function renderSizeSelection(state: Partial<typeof mockInitialState> = {}) {
	const store = createWorkflowStore({ ...mockInitialState, ...state });
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

		expect(screen.getByText(/16 pixels x 16 pixels/)).toBeInTheDocument();
	});

	it("shows the grid overlay when cells are spaced far apart on screen", () => {
		const { container } = renderSizeSelection();

		expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
	});

	it("keeps the grid visible but strided when cells get crowded", () => {
		// 4160 × 6240 at 16px tiles: cells render well under a pixel wide, so
		// the overlay draws every Nth line instead of fusing into a solid fill.
		const { container } = renderSizeSelection({
			sourceImage: {
				url: "blob:test",
				width: 4160,
				height: 6240,
				orientation: 1,
			},
		});

		const overlay = container.querySelector(
			'[aria-hidden="true"]',
		) as HTMLElement | null;
		expect(overlay).not.toBeNull();

		const widthPct = Number.parseFloat(
			overlay?.style.backgroundSize?.split(" ")[0] ?? "0",
		);
		const singleCellPct = (16 / 4160) * 100;
		expect(widthPct).toBeGreaterThan(singleCellPct);
	});

	it("debounces the size commit when the slider value changes", async () => {
		const telemetry = await import("../telemetry");
		const trackEvent = vi.spyOn(telemetry, "trackEvent");
		vi.useFakeTimers();
		const { store } = renderSizeSelection();
		trackEvent.mockClear();

		const rangeInput = screen.getByRole("slider");
		fireEvent.change(rangeInput, { target: { value: "32" } });

		// The draft lands in the atom immediately…
		expect(store.get(requestedTesseraSizeAtom)).toBe(32);
		// …but the commit side effect waits for the debounce.
		expect(trackEvent).not.toHaveBeenCalledWith(
			"tessera_size_changed",
			expect.anything(),
		);

		// Advance timers to allow debounce to complete
		vi.advanceTimersByTime(300);

		// Committed once after debounce
		expect(trackEvent).toHaveBeenCalledWith("tessera_size_changed", {
			size: 32,
		});
		trackEvent.mockRestore();
		vi.useRealTimers();
	});
});
