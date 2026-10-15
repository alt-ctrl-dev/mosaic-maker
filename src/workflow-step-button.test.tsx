import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";
import { declaredValuesFor } from "./test-utils/style-inspection";

describe("workflow-step-button styling", () => {
	it("uses surface background and text color for resting state", () => {
		render(<App />);

		const button = screen.getAllByRole("button", {
			name: /choose source image/i,
		})[0];
		expect(button).toBeDefined();

		expect(declaredValuesFor(button, "background-color")).toContain(
			tokens.surface,
		);
		expect(declaredValuesFor(button, "color")).toContain(tokens.text);
	});

	it("styles completed and disabled steps with distinct opacity", () => {
		render(<App />);

		// Advance so the first step becomes completed.
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		const stepButtons = within(
			screen.getByRole("complementary", { name: "Workflow steps" }),
		).getAllByRole("button");

		const completedStep = stepButtons[0];
		const disabledStep = stepButtons[2];

		expect(declaredValuesFor(completedStep, "opacity")).toContain("0.7");
		expect(declaredValuesFor(disabledStep, "opacity")).toContain("0.3");
	});
});
