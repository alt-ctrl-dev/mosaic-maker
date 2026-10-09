import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog } from "./components/Dialog";
import { tokens } from "./styles/tokens.stylex";
import { declarationsFor } from "./test-utils/style-inspection";

function renderDialog(): HTMLElement[] {
	render(
		<Dialog dialogId="mobile-workflow-menu" ariaLabel="Toggle workflow steps">
			<div />
		</Dialog>,
	);
	return screen.getAllByLabelText("Toggle workflow steps");
}

describe("sidebar toggle visibility", () => {
	it("renders the toggle controls as button elements", () => {
		const buttons = renderDialog();

		expect(buttons.length).toBe(2);
		for (const button of buttons) {
			expect(button.tagName).toBe("BUTTON");
			expect((button as HTMLButtonElement).type).toBe("button");
		}
	});

	it("hides the toggle controls on desktop (> 900px)", () => {
		const buttons = renderDialog();

		for (const button of buttons) {
			expect(declarationsFor(button, "display")).toContainEqual({
				value: "none",
				media: null,
			});
		}
	});

	it("shows the toggle controls on mobile (<= 900px)", () => {
		const buttons = renderDialog();

		for (const button of buttons) {
			expect(
				declarationsFor(button, "display").some(
					(declaration) =>
						declaration.value === "block" &&
						declaration.media?.includes("max-width: 900px"),
				),
			).toBe(true);
		}
	});

	it("gives the mobile toggle its own visible background", () => {
		const [toggleButton] = renderDialog();

		expect(
			declarationsFor(toggleButton, "background-color").some(
				(declaration) =>
					declaration.value === tokens.primary &&
					declaration.media?.includes("max-width: 900px"),
			),
		).toBe(true);
	});
});
