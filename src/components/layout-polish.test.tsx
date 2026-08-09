import { render, screen } from "@testing-library/react";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraUpload } from "./TesseraUpload";
import { INITIAL_WORKFLOW_STATE } from "../engine/workflow-state";

describe("Layout polish requirements", () => {
	it("renders GeneratedTesserae within a tessera-inputs container", () => {
		render(
			<div className="tessera-inputs">
				<GeneratedTesserae
					onTesseraeGenerated={vi.fn()}
					initialState={INITIAL_WORKFLOW_STATE}
				/>
			</div>,
		);

		expect(screen.getByTestId("generated-tesserae")).toBeInTheDocument();
	});

	it("renders TesseraUpload within a tessera-inputs container", () => {
		render(
			<div className="tessera-inputs">
				<TesseraUpload onTesseraeProcessed={vi.fn()} adjustedTesseraSize={16} />
			</div>,
		);

		expect(screen.getByTestId("tessera-upload")).toBeInTheDocument();
	});
});
