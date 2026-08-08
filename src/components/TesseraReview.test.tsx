import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TesseraReview } from "./TesseraReview";

const mockTesserae = [
	{
		file: new File([], "valid1.png"),
		fileName: "valid1.png",
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: "blob:valid1",
		isSupplemented: false,
	},
	{
		file: new File([], "invalid1.png"),
		fileName: "invalid1.png",
		isValid: false,
		error: "Invalid dimensions",
		isLowResolution: false,
		previewUrl: "blob:invalid1",
		isSupplemented: false,
	},
	{
		file: new File([], "supplemented1.png"),
		fileName: "supplemented1.png",
		isValid: true,
		error: null,
		isLowResolution: false,
		previewUrl: "blob:supplemented1",
		isSupplemented: true,
	},
];

describe("TesseraReview", () => {
	it("renders collapsed accordion with counts in summary", () => {
		const { container } = render(
			<TesseraReview
				tesserae={mockTesserae}
				onRemoveTessera={vi.fn()}
				onContinue={vi.fn()}
			/>,
		);

		// Check that the summary shows counts
		const summaryElement = container.querySelector("summary");
		expect(summaryElement).toBeTruthy();
		expect(summaryElement?.textContent).toContain(
			"Review tesserae (2 valid, 1 rejected)",
		);

		// Check that the accordion is closed by default (details not open)
		const detailsElement = container.querySelector("details");
		expect(detailsElement).toBeTruthy();
		expect(detailsElement && !detailsElement.hasAttribute("open")).toBeTruthy();
	});

	it("renders Continue button outside accordion", () => {
		const { container } = render(
			<TesseraReview
				tesserae={mockTesserae}
				onRemoveTessera={vi.fn()}
				onContinue={vi.fn()}
			/>,
		);

		// Find the continue button by text
		const continueButton = container.querySelector("button.primary");
		expect(continueButton).toBeTruthy();

		// Ensure continue button is outside the details element
		const details = continueButton?.closest("details");
		expect(details).toBeNull();
	});

	it("renders warnings outside accordion", () => {
		const { container } = render(
			<TesseraReview
				tesserae={mockTesserae}
				onRemoveTessera={vi.fn()}
				isLowVariety={true}
				varietyRecommendation={10}
			/>,
		);

		const warning = container.querySelector(".warning-message");
		expect(warning).toBeTruthy();

		// Ensure warning is outside the details element
		const details = warning?.closest("details");
		expect(details).toBeNull();
	});
});
