import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";
import { declaredValuesFor } from "./test-utils/style-inspection";

describe("workflow-step-button styling", () => {
	it("uses secondary background and color for resting state", () => {
		render(<App />);

		const button = screen.getAllByRole("button", {
			name: /choose source image/i,
		})[0];
		expect(button).toBeDefined();

		expect(declaredValuesFor(button, "background-color")).toContain(
			tokens.secondary,
		);
		expect(declaredValuesFor(button, "color")).toContain(tokens.onSecondary);
	});
});
