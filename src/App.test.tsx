import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("Mosaic Maker workflow", () => {
	it("presents all four stages in order", () => {
		render(<App />);

		const workflow = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const buttons = within(workflow).getAllByRole("button");
		const stages = buttons
			.filter(
				(button) =>
					!button.classList.contains("workflow-sidebar-close") &&
					!button.classList.contains("workflow-sidebar-toggle-button"),
			)
			.map(
				(button) =>
					within(button)
						.getByText(
							/^(Choose source image|Build tesserae|Generate and preview|Export mosaic)$/,
						)
						.textContent?.trim() ?? "",
			);

		expect(stages).toEqual([
			"Choose source image",
			"Build tesserae",
			"Generate and preview",
			"Export mosaic",
		]);
	});

	it("hides Next button on first load", () => {
		render(<App />);
		expect(screen.queryByText("Next →")).toBeNull();
	});

	it("renders Back button with secondary variant", () => {
		render(<App />);
		const backButton = screen.getByText("← Back");
		expect(backButton.classList.contains("secondary")).toBe(true);
	});
});
