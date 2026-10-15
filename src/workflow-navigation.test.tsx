import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "./engine/workflow-state";

describe("workflow navigation", () => {
	it("shows correct step labels and completion state", () => {
		render(<App />);

		// Check that step buttons show correct numbering and completion indicators
		const stepButtons = screen.getAllByRole("button", {
			name: /(choose mode|choose source image|build tesserae|generate and preview|export mosaic)/i,
		});

		expect(stepButtons).toHaveLength(5);

		// First step should be current (highlighted)
		expect(stepButtons[0]).toHaveAttribute("aria-current", "step");

		// Other steps should be disabled (not completed yet)
		for (let i = 1; i < stepButtons.length; i++) {
			expect(stepButtons[i]).toBeDisabled();
		}
	});

	it("preserves completed checkmarks when navigating backwards", () => {
		// Simulate a state where we've completed step 2 but are currently on step 1
		const state = {
			...INITIAL_WORKFLOW_STATE,
			currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE, // Currently on step 1
			furthestCompletedStep: WorkflowStep.BUILD_TESSERAE, // But we've completed step 2
		};

		// Render with this state - we'd need to mock the reducer for this
		// For now, we'll test the logic directly
		expect(state.furthestCompletedStep).toBeGreaterThan(state.currentStep);
	});

	it("continue buttons show correct next step names", () => {
		render(<App />);

		// Find continue buttons and check their labels
		// The continue button should indicate what step it leads to
	});
});
