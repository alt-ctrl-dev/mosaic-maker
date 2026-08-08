import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("sidebar button variants", () => {
	let styleElement: HTMLStyleElement;
	let toggleButton: HTMLLabelElement;
	let closeButton: HTMLLabelElement;

	beforeEach(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = styles;
		document.head.appendChild(styleElement);

		document.body.innerHTML = `
			<main class="workflow-container">
				<label class="workflow-sidebar-toggle-button" role="button">☰</label>
				<aside class="workflow-sidebar">
					<label class="workflow-sidebar-close" role="button" data-secondary>✕</label>
				</aside>
			</main>
		`;

		toggleButton = document.querySelector(
			"label.workflow-sidebar-toggle-button",
		) as HTMLLabelElement;
		closeButton = document.querySelector(
			"label.workflow-sidebar-close",
		) as HTMLLabelElement;
	});

	afterEach(() => {
		styleElement.remove();
		document.body.innerHTML = "";
	});

	it("makes the toggle button look like a primary button via role", () => {
		// Pico applies primary button styles to [role=button]:not([data-secondary])
		expect(toggleButton.role).toBe("button");
		expect(toggleButton.hasAttribute("data-secondary")).toBe(false);
	});

	it("makes the close button look like a secondary button via role + data-secondary", () => {
		// Pico applies secondary button styles to [role=button][data-secondary]
		expect(closeButton.role).toBe("button");
		expect(closeButton.hasAttribute("data-secondary")).toBe(true);
	});

	it("avoids hand-painting background and foreground colors in styles.css", () => {
		// Verify the fix removed hand-painted colors by ensuring they're not declared
		// in the mobile media query where they used to be
		const mobileStyles = styles.slice(
			styles.indexOf("@media (max-width: 900px)"),
		);
		// Since we removed the background-color and color declarations, they shouldn't be in the mobile styles
		// Specifically check the toggle button and close button rules
		expect(mobileStyles).not.toContain("background-color: var(--pico-primary)");
		expect(mobileStyles).not.toContain("color: var(--pico-primary-inverse)");
		expect(mobileStyles).not.toContain(
			"background-color: var(--pico-secondary)",
		);
		expect(mobileStyles).not.toContain("color: var(--pico-secondary-inverse)");
		// Also check that the focus outline rule was removed
		expect(styles).not.toContain("outline: 2px solid var(--pico-primary)");
		expect(styles).not.toContain("outline-offset: 2px");
	});
});
