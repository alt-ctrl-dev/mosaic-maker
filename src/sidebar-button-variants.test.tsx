import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("sidebar button variants", () => {
	it("renders the toggle button without the data-secondary attribute", () => {
		render(<App />);

		const toggleButton = screen.getByRole("button", {
			name: "Toggle workflow steps",
		});

		expect(toggleButton.tagName).toBe("BUTTON");
		expect(toggleButton.hasAttribute("data-secondary")).toBe(false);
	});

	it("renders the close button with the data-secondary attribute", () => {
		render(<App />);

		const sidebar = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const closeButton = within(sidebar).getByRole("button", {
			name: "Close workflow steps",
		});

		expect(closeButton.tagName).toBe("BUTTON");
		expect(closeButton.hasAttribute("data-secondary")).toBe(true);
	});
});
