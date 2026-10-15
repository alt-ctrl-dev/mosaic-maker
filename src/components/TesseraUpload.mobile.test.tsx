import { render, screen } from "@testing-library/react";
import { TesseraUpload } from "./TesseraUpload";

vi.mock("../engine/tessera-processing", () => ({
	processTesserae: vi.fn().mockResolvedValue([]),
}));

vi.mock("../haptics", () => ({
	vibrate: vi.fn(),
}));

vi.mock("../telemetry", () => ({
	trackError: vi.fn(),
	trackStepView: vi.fn(),
}));

vi.mock("../engine/resource-policy", () => ({
	isFileSizeExceeded: vi.fn().mockReturnValue(false),
	isTotalRetainedSizeExceeded: vi.fn().mockReturnValue(false),
	isTesseraFileLimitExceeded: vi.fn().mockReturnValue(false),
	isDimensionLimitExceeded: vi.fn().mockReturnValue(false),
	getImageDimensions: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
	getFileSizeErrorMessage: vi.fn().mockReturnValue("File too large"),
	getTotalSizeErrorMessage: vi.fn().mockReturnValue("Total size exceeded"),
	getFileCountErrorMessage: vi.fn().mockReturnValue("Too many files"),
	getDimensionErrorMessage: vi.fn().mockReturnValue("Dimensions too large"),
}));

describe("TesseraUpload mobile adaptations", () => {
	it("shows touch-honest copy in dropzone", () => {
		render(
			<TesseraUpload
				onTesseraeProcessed={vi.fn()}
				adjustedTesseraSize={16}
				currentTesserae={[]}
			/>,
		);

		const paragraph = screen.getByText(/choose|select|tap/i);
		expect(paragraph).toBeInTheDocument();
	});

	it("does not show drop-focused copy on mobile", () => {
		render(
			<TesseraUpload
				onTesseraeProcessed={vi.fn()}
				adjustedTesseraSize={16}
				currentTesserae={[]}
			/>,
		);

		expect(screen.queryByText(/drop.*images.*here/i)).not.toBeInTheDocument();
	});
});
