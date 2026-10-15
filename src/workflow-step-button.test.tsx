import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { tokens } from "./styles/tokens.stylex";
import { declaredValuesFor } from "./test-utils/style-inspection";

describe("workflow-step-button styling", () => {
	it("uses surface background and text color for resting state", () => {
		render(<App />);

		const button = screen.getAllByRole("button", {
			name: /build tiles/i,
		})[0];
		expect(button).toBeDefined();

		expect(declaredValuesFor(button, "background-color")).toContain(
			tokens.surface,
		);
		expect(declaredValuesFor(button, "color")).toContain(tokens.text);
	});
});
