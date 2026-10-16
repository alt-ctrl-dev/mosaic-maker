import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./version", () => ({
	VERSION_STRING: "v1.0.0+abc1234",
	PACKAGE_VERSION: "1.0.0",
	COMMIT_SHA: "abc1234",
}));

afterEach(cleanup);

describe("Mosaic Maker workflow", () => {
	it("presents all five stages in order", () => {
		render(<App />);

		const workflow = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const stages = within(workflow)
			.getAllByRole("button")
			.map(
				(button) =>
					within(button)
						.getByText(
							/^(Choose source image|Pick tile size|Pick tiles|Generate and preview|Export mosaic)$/,
						)
						.textContent?.trim() ?? "",
			);

		expect(stages).toEqual([
			"Choose source image",
			"Pick tile size",
			"Pick tiles",
			"Generate and preview",
			"Export mosaic",
		]);
	});

	it("keeps the top mode switcher and step navigation in sync", () => {
		render(<App />);

		// The workflow starts at source image; mode lives in the top switcher.
		expect(
			screen.getAllByRole("button", { name: /choose source image/i })[0],
		).toHaveAttribute("aria-current", "step");

		fireEvent.click(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		);
		expect(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		).toBeChecked();
		expect(
			screen.getByRole("radio", { name: /Select Photomosaic mode/ }),
		).not.toBeChecked();
	});

	it("starts each mounted workflow with independent state", () => {
		const first = render(<App />);
		fireEvent.click(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		);

		const second = render(<App />);
		expect(
			within(second.container).getByRole("radio", {
				name: /Select Photomosaic mode/,
			}),
		).toBeChecked();
		expect(
			within(first.container).getByRole("radio", {
				name: /Select Brick Style mode/,
			}),
		).toBeChecked();
	});

	it("renders no wizard counter or back/next chrome", () => {
		render(<App />);
		expect(screen.queryByText(/Step \d of \d/)).toBeNull();
		expect(screen.queryByText("← Back")).toBeNull();
		expect(screen.queryByText("Next →")).toBeNull();
	});

	it("displays the privacy note", () => {
		render(<App />);

		const eyebrow = screen.getByText(/Private · in-browser/);
		expect(eyebrow).toBeInTheDocument();
		expect(eyebrow.tagName).toBe("P");
	});

	it("displays the version footer with correct information", () => {
		render(<App />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveTextContent("Mosaic Maker v1.0.0+abc1234");
	});
});
