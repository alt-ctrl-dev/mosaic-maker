import { render, screen } from "@testing-library/react";
import { BrickColorPicker } from "./BrickColorPicker";

describe("BrickColorPicker", () => {
	it("renders preset palette swatches with explicit sizes", () => {
		render(<BrickColorPicker onTesseraeSelected={vi.fn()} />);

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
		render(
			<BrickColorPicker
				onTesseraeSelected={vi.fn()}
				initialColors={["#FF0000"]}
			/>,
		);

		// Find the selected brick image
		const brickImage = screen.getByAltText("Brick tessera #FF0000");
		expect(brickImage).toBeInTheDocument();

		// Assert that the image has bounded size styles
		expect(brickImage).toHaveStyle({
			maxWidth: "64px",
			maxHeight: "64px",
		});
	});
});
