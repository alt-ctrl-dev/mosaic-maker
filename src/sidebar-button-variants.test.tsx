import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("sidebar button variants", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("renders the toggle button as a semantic button without data-secondary", () => {
		render(<App />);

		const toggleButton = screen.getByRole("button", {
			name: "Toggle workflow steps",
		});

		// Native <button> has implicit role="button";
		// absence of data-secondary means Pico applies primary variant
		expect(toggleButton.hasAttribute("data-secondary")).toBe(false);
	});

	it("renders the close button as a semantic button with data-secondary", () => {
		render(<App />);

		const sidebar = screen.getByRole("complementary", {
			name: "Workflow steps",
		});
		const closeButton = within(sidebar).getByRole("button", {
			name: "Close workflow steps",
		});

		// Pico applies secondary variant when data-secondary is present
		expect(closeButton.hasAttribute("data-secondary")).toBe(true);
	});

	it("avoids hand-painting background and foreground colors in styles.css", () => {
		const mobileStyles = styles.slice(
			styles.indexOf("@media (max-width: 900px)"),
		);
		expect(mobileStyles).not.toContain("background-color: var(--pico-primary)");
		expect(mobileStyles).not.toContain("color: var(--pico-primary-inverse)");
		expect(mobileStyles).not.toContain(
			"background-color: var(--pico-secondary)",
		);
		expect(mobileStyles).not.toContain("color: var(--pico-secondary-inverse)");
		expect(styles).not.toContain("outline: 2px solid var(--pico-primary)");
		expect(styles).not.toContain("outline-offset: 2px");
	});
});
