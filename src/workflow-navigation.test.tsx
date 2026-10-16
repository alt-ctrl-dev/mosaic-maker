import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./engine/image-processing", () => ({
	getSourceImageInfo: () =>
		Promise.resolve({ url: "blob:test", width: 100, height: 100 }),
}));

const EXPECTED_STEP_TITLES = [
	"Choose source image",
	"Pick tile size",
	"Pick tiles",
	"Generate and preview",
] as const;

/**
 * Returns the step buttons. The desktop rack was removed; the steps now
 * live in the mobile step-menu dialog, which is hidden in jsdom.
 */
function getStepButtons() {
	const menu = document.getElementById("mobile-workflow-menu");
	if (!menu) throw new Error("step menu not found");
	// Scope to the step list so the dialog's close toggle is excluded.
	const list = menu.querySelector("ol");
	if (!list) throw new Error("step list not found");
	return within(list).getAllByRole("button", { hidden: true });
}

describe("workflow navigation", () => {
	it("shows the step labels in order with current and disabled states", () => {
		render(<App />);

		const stepButtons = getStepButtons();
		expect(stepButtons).toHaveLength(EXPECTED_STEP_TITLES.length);

		const labels = stepButtons.map((button) => {
			const title = within(button)
				.getByText(
					/^(Choose source image|Pick tile size|Pick tiles|Generate and preview)$/,
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

	it("preserves completed checkmarks when navigating backwards", async () => {
		render(<App />);

		// Selecting a valid source image completes the first step and advances.
		fireEvent.change(screen.getByLabelText("Select source image"), {
			target: { files: [new File(["x"], "source.png", { type: "image/png" })] },
		});

		const completedStep = await waitFor(() => {
			const button = getStepButtons()[0];
			expect(button.querySelector("svg")).not.toBeNull();
			return button;
		});

		// Navigate back to the completed step via the step rack.
		fireEvent.click(completedStep);

		// The checkmark survives the backward navigation.
		const currentStep = getStepButtons()[0];
		expect(currentStep).toHaveAttribute("aria-current", "step");
		expect(currentStep.querySelector("svg")).not.toBeNull();
	});
});
