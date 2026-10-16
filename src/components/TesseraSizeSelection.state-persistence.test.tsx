import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithWorkflow } from "../test-utils/workflow";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

describe("TesseraSizeSelection state persistence", () => {
	it("initializes slider value from the stored requested size", () => {
		renderWithWorkflow(<TesseraSizeSelection />, {
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
			requestedTesseraSize: 32,
			adjustedTesseraSize: 32,
		});

		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("32");
		expect(screen.getByText(/32 pixels x 32 pixels/)).toBeInTheDocument();
	});

	it("uses default value of 16 when no size is stored", () => {
		renderWithWorkflow(<TesseraSizeSelection />);

		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("16");
	});
});
