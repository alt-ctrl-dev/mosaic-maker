import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppFooter } from "./AppFooter";

vi.mock("../version", () => ({
	VERSION_STRING: "v1.0.0+abc1234",
	PACKAGE_VERSION: "1.0.0",
	COMMIT_SHA: "abc1234",
}));

describe("AppFooter", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("renders a centered footer with the version string", () => {
		render(<AppFooter />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveTextContent("Mosaic Maker v1.0.0+abc1234");
		expect(footer).toHaveStyle("text-align: center");
		expect(footer).toHaveStyle("padding: 16px");
	});

	it("renders the telemetry consent checkbox checked by default", () => {
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).toBeInTheDocument();
		expect(checkbox).toBeChecked();
	});

	it("persists consent preference when checkbox is toggled", () => {
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		fireEvent.click(checkbox);
		expect(checkbox).not.toBeChecked();
		expect(localStorage.getItem("telemetry-consent")).toBe("false");

		fireEvent.click(checkbox);
		expect(checkbox).toBeChecked();
		expect(localStorage.getItem("telemetry-consent")).toBe("true");
	});

	it("reads initial consent state from localStorage", () => {
		localStorage.setItem("telemetry-consent", "false");
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).not.toBeChecked();
	});
});
