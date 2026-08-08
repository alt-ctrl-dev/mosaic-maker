import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TesseraReview } from "./TesseraReview";
import "@testing-library/jest-dom/vitest";
import type { TesseraInfo } from "../engine/workflow-state";

const MOCK_PREVIEW =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

const noop = () => {};

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

describe("TesseraReview", () => {
	it("renders collapsed accordion with counts in summary", () => {
		const { container } = render(
			<TesseraReview
				tesserae={mockTesserae}
				onRemoveTessera={vi.fn()}
				onContinue={vi.fn()}
			/>,
		);

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

		const details = warning?.closest("details");
		expect(details).toBeNull();
	});

	it("applies invalid styling when tessera is not valid", () => {
		const tesserae = [
			mockTessera({
				fileName: "invalid-tessera.jpg",
				isValid: false,
				error: "File too small",
			}),
		];

		render(
			<TesseraReview
				tesserae={tesserae}
				onRemoveTessera={noop}
				onContinue={noop}
			/>,
		);

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

		render(
			<TesseraReview
				tesserae={tesserae}
				onRemoveTessera={noop}
				onContinue={noop}
			/>,
		);

		const item = screen
			.getByText("supplemented-tessera.jpg")
			.closest(".tessera-item");
		expect(item).toHaveClass("supplemented");
		expect(item).toBeInTheDocument();
		expect(screen.getByText("Supplemented")).toBeInTheDocument();
	});
});
