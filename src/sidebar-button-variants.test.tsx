import { cleanup, render, screen } from "@testing-library/react";
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
});
