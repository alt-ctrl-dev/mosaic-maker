import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";

describe("Layout Container", () => {
	it("should wrap the app content with layout container class", () => {
		render(<App />);

		// Check that the layout container exists
		const layoutContainer = screen
			.getByText("Mosaic Maker")
			.closest(".layout-container");
		expect(layoutContainer).not.toBeNull();

		// Check that header is inside the layout container
		const header = screen.getByRole("banner");
		expect(header.closest(".layout-container")).not.toBeNull();

		// Check that main content is inside the layout container
		const main = screen.getByRole("main");
		expect(main.closest(".layout-container")).not.toBeNull();
	});
});
