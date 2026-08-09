import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("sidebar button variants", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("renders the toggle button as a semantic button without data-secondary", () => {
		render(<App />);

		const toggleButton = screen.getByRole("button", {
			name: "Toggle workflow steps",
		});

		// Native <button> has implicit role="button";
		// absence of data-secondary means Pico applies its primary variant
		expect(toggleButton.tagName).toBe("BUTTON");
		expect(toggleButton.hasAttribute("data-secondary")).toBe(false);
	});

	it("renders the close button as a semantic button with data-secondary", () => {
		render(<App />);

		const sidebar = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const closeButton = within(sidebar).getByRole("button", {
			name: "Close workflow steps",
		});

		// Pico applies the secondary variant when data-secondary is present
		expect(closeButton.tagName).toBe("BUTTON");
		expect(closeButton.hasAttribute("data-secondary")).toBe(true);
	});
});
