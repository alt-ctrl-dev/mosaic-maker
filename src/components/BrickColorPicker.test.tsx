import { screen } from "@testing-library/react";
import { createBrickTesserae } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { BrickColorPicker } from "./BrickColorPicker";

describe("BrickColorPicker", () => {
	it("renders preset palette swatches with explicit sizes", () => {
		renderWithWorkflow(<BrickColorPicker />);

		// Find the first preset palette swatch
		const swatch = screen.getByTitle("#FF0000"); // First color in Classic Bricks palette
		expect(swatch).toBeInTheDocument();

		// Assert that the swatch has explicit width and height styles
		expect(swatch).toHaveStyle({
			width: "32px",
			height: "32px",
		});
	});

	it("renders selected brick images with bounded sizes", () => {
		renderWithWorkflow(<BrickColorPicker />, {
			mode: "brick",
			tesserae: createBrickTesserae(["#FF0000"]),
		});

		// Find the selected brick image
		const brickImage = screen.getByAltText("Brick tile #FF0000");
		expect(brickImage).toBeInTheDocument();

		// Assert that the image has bounded size styles
		expect(brickImage).toHaveStyle({
			maxWidth: "64px",
			maxHeight: "64px",
		});
	});
});
