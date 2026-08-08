import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TesseraReview } from "./TesseraReview";
import "@testing-library/jest-dom/vitest";

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

		const detailsElement = container.querySelector("details");
		expect(detailsElement).toBeTruthy();
		expect((detailsElement as HTMLDetailsElement).open).toBe(false);
	});

	it("renders Continue button outside accordion", () => {
		const { container } = render(
			<TesseraReview
				tesserae={mockTesserae}
				onRemoveTessera={vi.fn()}
				onContinue={vi.fn()}
			/>,
		);

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

	it("renders invalid tessera with visual distinction using Pico form validation colors", () => {
		const tesserae = [
			{
				file: new File([], "invalid-tessera.jpg"),
				fileName: "invalid-tessera.jpg",
				isValid: false,
				isSupplemented: false,
				error: "File too small",
				isLowResolution: false,
				previewUrl:
					"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
			},
		];

		render(
			<TesseraReview
				tesserae={tesserae}
				onRemoveTessera={() => {}}
				onContinue={() => {}}
			/>,
		);

		const invalidTessera = screen
			.getByText("invalid-tessera.jpg")
			.closest(".tessera-item");
		expect(invalidTessera).toHaveClass("invalid");
		// Note: We can't easily test computed styles in JSDOM, but we can verify the element exists
		expect(invalidTessera).toBeInTheDocument();
	});

	it("renders supplemented tessera with visual distinction using Pico form validation colors", () => {
		const tesserae = [
			{
				file: new File([], "supplemented-tessera.jpg"),
				fileName: "supplemented-tessera.jpg",
				isValid: true,
				isSupplemented: true,
				error: null,
				isLowResolution: false,
				previewUrl:
					"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
			},
		];

		render(
			<TesseraReview
				tesserae={tesserae}
				onRemoveTessera={() => {}}
				onContinue={() => {}}
			/>,
		);

		const supplementedTessera = screen
			.getByText("supplemented-tessera.jpg")
			.closest(".tessera-item");
		expect(supplementedTessera).toHaveClass("supplemented");
		// Note: We can't easily test computed styles in JSDOM, but we can verify the element exists
		expect(supplementedTessera).toBeInTheDocument();
		expect(screen.getByText("Supplemented")).toBeInTheDocument();
	});
});
