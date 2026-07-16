import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("Mosaic Maker workflow", () => {
	it("presents all six stages in order", () => {
		render(<App />);

		const workflow = screen.getByRole("navigation", {
			name: "Mosaic workflow",
		});
		const stages = within(workflow)
			.getAllByRole("heading", { level: 2 })
			.map((stage) => stage.textContent);

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
