import { act, screen } from "@testing-library/react";
import { isGeneratingTilesAtom } from "../atoms/ui-atoms";
import { tesseraeAtom } from "../atoms/workflow-atoms";
import type { TesseraInfo } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { TesseraReview } from "./TesseraReview";

function mockTessera(overrides: Partial<TesseraInfo> = {}): TesseraInfo {
	return {
		fileName: "test.jpg",
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: null,
		...overrides,
	};
}

describe("TesseraReview accordion opening", () => {
	it("starts collapsed with no tiles", () => {
		const { container } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;
		expect(details.open).toBe(false);
	});

	it("opens the accordion when tiles are added", () => {
		const { container, store } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;

		act(() => {
			store.set(tesseraeAtom, [mockTessera({ fileName: "added.png" })]);
		});

		expect(details.open).toBe(true);
	});

	it("lets the user collapse the accordion again", () => {
		const { container, store } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;

		act(() => {
			store.set(tesseraeAtom, [mockTessera()]);
		});
		expect(details.open).toBe(true);

		act(() => {
			details.open = false;
			details.dispatchEvent(new Event("toggle"));
		});

		expect(details.open).toBe(false);
		// Still collapsed after an unrelated re-render.
		act(() => {
			store.set(tesseraeAtom, [mockTessera()]);
		});
		expect(details.open).toBe(false);
	});

	it("keeps a screen-reader announcement when counts change", () => {
		const { store } = renderWithWorkflow(<TesseraReview />);
		act(() => {
			store.set(tesseraeAtom, [mockTessera()]);
		});
		expect(
			screen.getByText("Tile counts updated: 1 valid, 0 rejected"),
		).toBeInTheDocument();
	});

	it("shows the loading row inside the accordion while generating", () => {
		const { container, store } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;

		act(() => {
			store.set(isGeneratingTilesAtom, true);
		});

		expect(details.open).toBe(true);
		const loading = screen.getByText("Generating tiles...");
		expect(loading.closest("details")).toBe(details);
	});
});
