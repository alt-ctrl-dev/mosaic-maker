import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";

describe("Layout Container", () => {
	it("should wrap the app content with layout container class", () => {
		render(<App />);

		const layoutContainer = screen
			.getByText("Mosaic Maker")
			.closest(".layout-container");
		expect(layoutContainer).not.toBeNull();

		const header = screen.getByRole("banner");
		expect(header.closest(".layout-container")).not.toBeNull();

		const main = screen.getByRole("main");
		expect(main.closest(".layout-container")).not.toBeNull();
	});
});
