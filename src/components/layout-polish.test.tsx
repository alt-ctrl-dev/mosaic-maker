import { screen } from "@testing-library/react";
import { renderWithWorkflow } from "../test-utils/workflow";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraUpload } from "./TesseraUpload";

describe("Layout polish requirements", () => {
	it("renders GeneratedTesserae within a tessera-inputs container", () => {
		renderWithWorkflow(
			<div className="tessera-inputs">
				<GeneratedTesserae />
			</div>,
		);

		expect(screen.getByTestId("generated-tesserae")).toBeInTheDocument();
	});

	it("renders TesseraUpload within a tessera-inputs container", () => {
		renderWithWorkflow(
			<div className="tessera-inputs">
				<TesseraUpload />
			</div>,
		);

		expect(screen.getByTestId("tessera-upload")).toBeInTheDocument();
	});
});
