import { cleanup, render, screen, within } from "@testing-library/react";
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
		const buttons = within(workflow).getAllByRole("button");
		const stages = buttons
			.filter((button) => !button.classList.contains("workflow-sidebar-close"))
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

		const footer = screen.getByText(/Mosaic Maker v1\.0\.0\+abc1234/);
		expect(footer).toBeInTheDocument();
		expect(footer.tagName).toBe("FOOTER");
	});
});
