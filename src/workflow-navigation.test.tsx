import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

const EXPECTED_STEP_TITLES = [
	"Choose mode",
	"Choose source image",
	"Build tesserae",
	"Generate and preview",
	"Export mosaic",
] as const;

/** Returns the visible step buttons in the workflow sidebar. */
function getStepButtons() {
	const sidebar = screen.getByRole("complementary", {
		name: "Workflow steps",
	});
	return within(sidebar).getAllByRole("button");
}

describe("workflow navigation", () => {
	it("shows the step labels in order with current and disabled states", () => {
		render(<App />);

		const stepButtons = getStepButtons();
		expect(stepButtons).toHaveLength(EXPECTED_STEP_TITLES.length);

		const labels = stepButtons.map((button) => {
			const title = within(button)
				.getByText(
					/^(Choose mode|Choose source image|Build tesserae|Generate and preview|Export mosaic)$/,
				)
				.textContent?.trim();
			return title;
		});
		expect(labels).toEqual([...EXPECTED_STEP_TITLES]);

		// First step is current; the rest are not yet reachable.
		expect(stepButtons[0]).toHaveAttribute("aria-current", "step");
		for (let i = 1; i < stepButtons.length; i++) {
			expect(stepButtons[i]).toBeDisabled();
		}
	});

	it("preserves completed checkmarks when navigating backwards", () => {
		render(<App />);

		// Advance from Choose mode to Choose source image.
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		// Choose mode is now completed and shows a checkmark.
		const completedStep = getStepButtons()[0];
		expect(within(completedStep).getByText("✓")).toBeInTheDocument();

		// Navigate back to Choose mode.
		fireEvent.click(screen.getByRole("button", { name: "← Back" }));

		// The checkmark survives the backward navigation.
		const currentStep = getStepButtons()[0];
		expect(currentStep).toHaveAttribute("aria-current", "step");
		expect(within(currentStep).getByText("✓")).toBeInTheDocument();
	});
});
