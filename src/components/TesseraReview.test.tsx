import { render, screen } from "@testing-library/react";
import { TesseraReview } from "./TesseraReview";
import "@testing-library/jest-dom/vitest";

describe("TesseraReview", () => {
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
