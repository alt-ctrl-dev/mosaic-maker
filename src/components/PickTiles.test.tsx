import { fireEvent, screen } from "@testing-library/react";
import { tesseraeAtom } from "../atoms/workflow-atoms";
import type { TesseraInfo } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { PickTiles } from "./PickTiles";

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

const sourceAndSize = {
	sourceImage: { url: "blob:test", width: 320, height: 320, orientation: 1 },
	adjustedTesseraSize: 16,
};

describe("PickTiles", () => {
	it("shows the upload path by default and hides the generator", () => {
		renderWithWorkflow(<PickTiles />);

		expect(screen.getByTestId("tessera-upload")).toBeInTheDocument();
		expect(screen.queryByTestId("generated-tesserae")).not.toBeInTheDocument();
	});

	it("switches to the generated path", () => {
		renderWithWorkflow(<PickTiles />);

		fireEvent.click(screen.getByRole("button", { name: "Generated tiles" }));

		expect(screen.getByTestId("generated-tesserae")).toBeInTheDocument();
		expect(screen.queryByTestId("tessera-upload")).not.toBeInTheDocument();
	});

	it("meters readiness against the variety recommendation", () => {
		renderWithWorkflow(<PickTiles />, sourceAndSize);

		expect(screen.getByText(/of ~\d+ recommended/)).toBeInTheDocument();
	});

	it("clears all tiles from inside the review accordion", () => {
		// A rejected tile keeps the accordion open, where the clear action lives.
		const { store } = renderWithWorkflow(<PickTiles />, {
			tesserae: [mockTessera({ isValid: false, error: "Too small" })],
		});

		const clearButton = screen.getByRole("button", { name: "Clear all tiles" });
		expect(clearButton.closest("details")).not.toBeNull();

		fireEvent.click(clearButton);

		expect(store.get(tesseraeAtom)).toHaveLength(0);
	});
});
