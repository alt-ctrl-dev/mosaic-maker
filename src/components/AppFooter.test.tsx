import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppFooter } from "./AppFooter";

vi.mock("../version", () => ({
	VERSION_STRING: "v1.0.0+abc1234",
	PACKAGE_VERSION: "1.0.0",
	COMMIT_SHA: "abc1234",
}));

function storedConsentRecord(): unknown {
	return JSON.parse(localStorage.getItem("telemetry-consent") ?? "null");
}

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

	it("renders the telemetry consent checkbox unchecked on a fresh visit", () => {
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).toBeInTheDocument();
		expect(checkbox).not.toBeChecked();
	});

	it("does not store a consent record on a fresh visit", () => {
		render(<AppFooter />);

		expect(localStorage.getItem("telemetry-consent")).toBeNull();
	});

	it("stores a versioned affirmative record when the user opts in", () => {
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		fireEvent.click(checkbox);

		expect(checkbox).toBeChecked();
		expect(storedConsentRecord()).toEqual({ version: 1, consent: true });
	});

	it("stores a versioned refusal record when the user opts out", () => {
		localStorage.setItem(
			"telemetry-consent",
			JSON.stringify({ version: 1, consent: true }),
		);
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		fireEvent.click(checkbox);

		expect(checkbox).not.toBeChecked();
		expect(storedConsentRecord()).toEqual({ version: 1, consent: false });
	});

	it("treats a legacy positive value as undecided and unchecked", () => {
		localStorage.setItem("telemetry-consent", "true");
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).not.toBeChecked();
		// No new choice has been made, so the legacy value is untouched.
		expect(localStorage.getItem("telemetry-consent")).toBe("true");
	});

	it("keeps a stored refusal as refusal across renders", () => {
		localStorage.setItem("telemetry-consent", "false");
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).not.toBeChecked();
		expect(localStorage.getItem("telemetry-consent")).toBe("false");
	});

	it("renders checked from a stored versioned affirmative record", () => {
		localStorage.setItem(
			"telemetry-consent",
			JSON.stringify({ version: 1, consent: true }),
		);
		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).toBeChecked();
	});

	it("keeps working without throwing when storage is blocked", () => {
		const getItem = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new Error("localStorage blocked");
			});
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("localStorage blocked");
			});

		render(<AppFooter />);

		const checkbox = screen.getByLabelText("Share anonymous usage data");
		expect(checkbox).not.toBeChecked();
		fireEvent.click(checkbox);
		expect(checkbox).toBeChecked();

		getItem.mockRestore();
		setItem.mockRestore();
	});
});
