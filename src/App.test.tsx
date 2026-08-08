import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("Mosaic Maker workflow", () => {
	it("presents all six stages in order", () => {
		render(<App />);

		const workflow = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const buttons = within(workflow).getAllByRole("button");
		const stages = buttons.map(
			(button) =>
				within(button).getByText(
					/^(Choose source image|Set tessera size|Choose tesserae|Review tesserae|Generate and preview|Export mosaic)$/,
				).textContent ?? "",
		);

		expect(stages).toEqual([
			"Choose source image",
			"Set tessera size",
			"Choose tesserae",
			"Review tesserae",
			"Generate and preview",
			"Export mosaic",
		]);
	});

	it("hides Next button on first load", () => {
		render(<App />);
		expect(screen.queryByText("Next →")).toBeNull();
	});
});
