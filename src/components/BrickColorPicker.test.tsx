import { fireEvent, screen } from "@testing-library/react";
import { createBrickTesserae } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { BrickColorPicker } from "./BrickColorPicker";

describe("BrickColorPicker", () => {
	it("renders palette brick cells with explicit sizes", () => {
		renderWithWorkflow(<BrickColorPicker />);

		// First color in Classic Bricks palette, rendered as a brick image
		const brickImage = screen.getAllByAltText("")[0];
		expect(brickImage).toHaveStyle({
			width: "100%",
			height: "100%",
		});

		// The cell itself carries the explicit tap-target size
		const cell = screen.getByRole("button", { name: "Add brick #FF0000" });
		expect(cell).toHaveStyle({
			width: "44px",
			height: "44px",
		});
	});

	it("renders tray brick images inside bounded slots", () => {
		renderWithWorkflow(<BrickColorPicker />, {
			mode: "brick",
			tesserae: createBrickTesserae(["#FF0000"]),
		});

		const traySlot = screen.getByRole("button", {
			name: "Remove brick #FF0000 from tray",
		});
		expect(traySlot).toHaveStyle({
			width: "44px",
			height: "44px",
		});
		expect(screen.getByAltText("Brick tile #FF0000")).toBeInTheDocument();
	});

	it("toggles a brick into and out of the tray", () => {
		renderWithWorkflow(<BrickColorPicker />, { mode: "brick" });

		fireEvent.click(screen.getByRole("button", { name: "Add brick #FF0000" }));
		expect(
			screen.getByRole("button", { name: "Remove brick #FF0000 from tray" }),
		).toBeInTheDocument();
		expect(screen.getByText("1 / 15 tiles")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Remove brick #FF0000" }),
		);
		expect(screen.getByText("0 / 15 tiles")).toBeInTheDocument();
	});

	it("loads a preset palette into the tray", () => {
		renderWithWorkflow(<BrickColorPicker />, { mode: "brick" });

		fireEvent.click(screen.getAllByRole("button", { name: "Load" })[0]);

		expect(screen.getByText("10 / 15 tiles")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Remove brick #FFFF00 from tray" }),
		).toBeInTheDocument();
	});

	it("shows the minimum hint below 2 tiles and hides it at 2", () => {
		renderWithWorkflow(<BrickColorPicker />, { mode: "brick" });

		expect(
			screen.getByText("Add at least 2 tiles to continue."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Add brick #FF0000" }));
		fireEvent.click(screen.getByRole("button", { name: "Add brick #0000FF" }));

		expect(
			screen.queryByText("Add at least 2 tiles to continue."),
		).not.toBeInTheDocument();
	});

	it("blocks new additions when the tray is full", () => {
		const fullSet = [
			"#FF0000",
			"#0000FF",
			"#FFFF00",
			"#00FF00",
			"#FFFFFF",
			"#000000",
			"#FF6600",
			"#800080",
			"#FFC0CB",
			"#8B4513",
			"#FFB6C1",
			"#FFD700",
			"#E6E6FA",
			"#98FB98",
			"#87CEEB",
		];
		renderWithWorkflow(<BrickColorPicker />, {
			mode: "brick",
			tesserae: createBrickTesserae(fullSet),
		});

		expect(
			screen.getByText("Tray full — remove a tile to add another."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Add brick #FFE4B5" }),
		).toBeDisabled();
		// Selected bricks stay removable
		expect(
			screen.getByRole("button", { name: "Remove brick #FF0000" }),
		).toBeEnabled();
	});

	it("adds a custom color to the tray and lists it under Mine", () => {
		renderWithWorkflow(<BrickColorPicker />, { mode: "brick" });

		fireEvent.change(screen.getByLabelText("Select custom color"), {
			target: { value: "#123456" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add to tray" }));

		expect(
			screen.getByRole("button", { name: "Remove brick #123456 from tray" }),
		).toBeInTheDocument();
		expect(screen.getByText("Mine")).toBeInTheDocument();

		// Duplicate is refused
		expect(
			screen.getByRole("button", { name: "Already in tray" }),
		).toBeDisabled();
	});
});
