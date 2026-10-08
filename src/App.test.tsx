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
	it("presents all four stages in order", () => {
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
							/^(Choose mode|Choose source image|Build tesserae|Generate and preview|Export mosaic)$/,
						)
						.textContent?.trim() ?? "",
			);

		expect(stages).toEqual([
			"Choose mode",
			"Choose source image",
			"Build tesserae",
			"Generate and preview",
			"Export mosaic",
		]);
	});

	it("keeps mode selection and step navigation in sync", () => {
		render(<App />);

		fireEvent.click(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		);
		expect(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		).toBeChecked();
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "← Back" }));
		expect(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		).toBeChecked();
	});

	it("starts each mounted workflow with independent state", () => {
		const first = render(<App />);
		fireEvent.click(
			screen.getByRole("radio", { name: /Select Brick Style mode/ }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		const second = render(<App />);
		expect(
			within(second.container).getByText("Step 1 of 5"),
		).toBeInTheDocument();
		expect(
			within(second.container).getByRole("radio", {
				name: /Select Photomosaic \(Default\) mode/,
			}),
		).toBeChecked();
		expect(
			within(first.container).getByText("Step 2 of 5"),
		).toBeInTheDocument();
	});

	it("hides Next button on first load", () => {
		render(<App />);
		expect(screen.queryByText("Next →")).toBeNull();
	});

	it("hides Back button on first load", () => {
		render(<App />);
		expect(screen.queryByText("← Back")).toBeNull();
	});

	it("displays the header eyebrow text with offline support information", () => {
		render(<App />);

		const eyebrow = screen.getByText(
			/Private, in-browser image making • Works offline once loaded/,
		);
		expect(eyebrow).toBeInTheDocument();
		expect(eyebrow.tagName).toBe("P");
		expect(eyebrow).toHaveClass("eyebrow");
	});

	it("displays the version footer with correct information", () => {
		render(<App />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveTextContent("Mosaic Maker v1.0.0+abc1234");
	});
});
