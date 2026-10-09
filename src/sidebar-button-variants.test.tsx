import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("sidebar button variants", () => {
	it("renders the toggle button without the data-secondary attribute", () => {
		render(<App />);

		// The toggle controls are display:none outside the mobile media query,
		// which StyleX injects into jsdom, so query them by label instead of role.
		const toggleButtons = screen.getAllByLabelText("Toggle workflow steps");

		expect(toggleButtons.length).toBeGreaterThan(0);
		for (const toggleButton of toggleButtons) {
			expect(toggleButton.tagName).toBe("BUTTON");
			expect(toggleButton.hasAttribute("data-secondary")).toBe(false);
		}
	});
});
