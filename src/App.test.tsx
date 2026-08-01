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
		const stages = within(workflow)
			.getAllByRole("button")
			.map((button) => {
				const titleSpan = within(button).getByText(
					/Choose|Set|Review|Generate|Export/,
				);
				return titleSpan.textContent?.trim() || "";
			});

		expect(stages).toEqual([
			"Choose source image",
			"Set tessera size",
			"Choose tesserae",
			"Review tesserae",
			"Generate and preview",
			"Export mosaic",
		]);
	});
});
