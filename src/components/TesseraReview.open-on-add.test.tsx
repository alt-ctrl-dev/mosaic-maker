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

	it("stays closed and pulses the summary when tiles are added", () => {
		const { container, store } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;
		const summary = container.querySelector("summary") as HTMLElement;
		const baseClass = summary.className;

		act(() => {
			store.set(tesseraeAtom, [mockTessera({ fileName: "added.png" })]);
		});

		expect(details.open).toBe(false);
		// The pulse adds animation classes to the summary.
		expect(summary.className).not.toBe(baseClass);
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

	it("stays closed while generating and pulses the summary", () => {
		const { container, store } = renderWithWorkflow(<TesseraReview />);
		const details = container.querySelector("details") as HTMLDetailsElement;
		const summary = container.querySelector("summary") as HTMLElement;
		const baseClass = summary.className;

		act(() => {
			store.set(isGeneratingTilesAtom, true);
		});

		expect(details.open).toBe(false);
		expect(summary.className).not.toBe(baseClass);
		// The loading row still renders inside the closed accordion.
		const loading = screen.getByText("Generating tiles...");
		expect(loading.closest("details")).toBe(details);
	});
});
