import { screen } from "@testing-library/react";
import { tesseraeAtom } from "../atoms/workflow-atoms";
import type { TesseraInfo } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { TesseraReview } from "./TesseraReview";

const MOCK_PREVIEW =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

/** Creates a minimal {@link TesseraInfo} for testing, overriding any fields. */
function mockTessera(overrides: Partial<TesseraInfo> = {}): TesseraInfo {
	return {
		file: new File([], overrides.fileName ?? "test.jpg"),
		fileName: "test.jpg",
		isValid: true,
		isSupplemented: false,
		error: null,
		isLowResolution: false,
		previewUrl: MOCK_PREVIEW,
		...overrides,
	};
}

const mockTesserae = [
	mockTessera({ fileName: "valid1.png" }),
	mockTessera({
		fileName: "invalid1.png",
		isValid: false,
		error: "Invalid dimensions",
	}),
	mockTessera({ fileName: "supplemented1.png", isSupplemented: true }),
];

/**
 * Source and size chosen so the grid has 100 cells and the variety
 * recommendation is 10, which the 2-3 valid fixtures fall below.
 */
const lowVarietyState = {
	sourceImage: { width: 100, height: 100, orientation: 1, url: "blob:test" },
	requestedTesseraSize: 10,
};

describe("TesseraReview", () => {
	it("renders open accordion with counts in summary when invalid tesserae exist", () => {
		const { container } = renderWithWorkflow(<TesseraReview />, {
			tesserae: mockTesserae,
		});

		const summaryElement = container.querySelector("summary");
		expect(summaryElement).toBeTruthy();
		expect(summaryElement?.textContent).toContain(
			"Review tiles (2 valid, 1 rejected)",
		);

		const detailsElement = container.querySelector("details");
		expect(detailsElement).toBeTruthy();
		// Open by default because the collection contains a rejected tessera.
		expect((detailsElement as HTMLDetailsElement).open).toBe(true);
	});

	it("renders Continue button outside accordion", () => {
		renderWithWorkflow(<TesseraReview />, { tesserae: mockTesserae });

		const continueButton = screen.getByRole("button", {
			name: /continue to step 4/i,
		});

		const details = continueButton?.closest("details");
		expect(details).toBeNull();
	});

	it("renders warnings inside accordion", () => {
		const { container } = renderWithWorkflow(<TesseraReview />, {
			...lowVarietyState,
			tesserae: mockTesserae,
		});

		const warning = container.querySelector(".warning-message");
		expect(warning).toBeTruthy();

		const details = warning?.closest("details");
		expect(details).not.toBeNull();
	});

	it("applies invalid styling when tessera is not valid", () => {
		const tesserae = [
			mockTessera({
				fileName: "invalid-tessera.jpg",
				isValid: false,
				error: "File too small",
			}),
		];

		renderWithWorkflow(<TesseraReview />, { tesserae });

		const item = screen
			.getByText("invalid-tessera.jpg")
			.closest(".tessera-item");
		expect(item).toHaveClass("invalid");
		expect(item).toBeInTheDocument();
	});

	it("applies supplemented styling and label when tessera is supplemented", () => {
		const tesserae = [
			mockTessera({
				fileName: "supplemented-tessera.jpg",
				isSupplemented: true,
			}),
		];

		renderWithWorkflow(<TesseraReview />, { tesserae });

		const item = screen
			.getByText("supplemented-tessera.jpg")
			.closest(".tessera-item");
		expect(item).toHaveClass("supplemented");
		expect(item).toBeInTheDocument();
		expect(screen.getByText("Supplemented")).toBeInTheDocument();
	});

	it("removes a tessera from the store when Remove is clicked", () => {
		const { store } = renderWithWorkflow(<TesseraReview />, {
			tesserae: mockTesserae,
		});

		screen.getByRole("button", { name: "Remove invalid1.png" }).click();

		const tesserae = store.get(tesseraeAtom);
		expect(tesserae).toHaveLength(2);
		expect(tesserae.map((tessera) => tessera.fileName)).toEqual([
			"valid1.png",
			"supplemented1.png",
		]);
	});
});
