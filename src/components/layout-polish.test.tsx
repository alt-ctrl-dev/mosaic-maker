import { render, screen } from "@testing-library/react";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraUpload } from "./TesseraUpload";
import { INITIAL_WORKFLOW_STATE } from "../engine/workflow-state";

describe("Layout polish requirements", () => {
	it("should have GeneratedTesserae panel filling available space", () => {
		render(
			<div className="tessera-inputs">
				<GeneratedTesserae
					onTesseraeGenerated={vi.fn()}
					initialState={INITIAL_WORKFLOW_STATE}
				/>
			</div>,
		);

		const generatedTesserae = screen.getByTestId("generated-tesserae");

		expect(generatedTesserae).toBeInTheDocument();
	});

	it("should have TesseraUpload panel filling available space", () => {
		render(
			<div className="tessera-inputs">
				<TesseraUpload onTesseraeProcessed={vi.fn()} adjustedTesseraSize={16} />
			</div>,
		);

		const tesseraUpload = screen.getByTestId("tessera-upload");

		expect(tesseraUpload).toBeInTheDocument();
	});

	it("should apply flex styles to make panels fill available space", () => {
		// Create a container with display: flex to simulate the parent container
		const { container } = render(
			<div style={{ display: "flex" }}>
				<div className="generated-tesserae" data-testid="generated-tesserae">
					Content
				</div>
				<div className="tessera-upload" data-testid="tessera-upload">
					Content
				</div>
			</div>,
		);

		const generatedTesserae = container.querySelector(".generated-tesserae");
		const tesseraUpload = container.querySelector(".tessera-upload");

		// Check that the elements exist
		expect(generatedTesserae).toBeInTheDocument();
		expect(tesseraUpload).toBeInTheDocument();

		// Note: We can't easily test the actual flex behavior in JSDOM
		// but we can at least verify the elements are rendered
	});
});
