import { render, screen } from "@testing-library/react";
import { TesseraReview } from "./TesseraReview";
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

describe("TesseraReview", () => {
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
