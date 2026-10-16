import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.style.removeProperty("color-scheme");
	});

	it("offers the other scheme while the app follows the OS", () => {
		render(<ThemeToggle />);

		expect(
			screen.getByRole("button", { name: "Switch to light mode" }),
		).toBeInTheDocument();
		expect(localStorage.getItem("color-scheme")).toBeNull();
	});

	it("pins and saves the scheme when pressed", () => {
		render(<ThemeToggle />);

		fireEvent.click(
			screen.getByRole("button", { name: "Switch to light mode" }),
		);

		expect(
			document.documentElement.style.getPropertyValue("color-scheme"),
		).toBe("light");
		expect(localStorage.getItem("color-scheme")).toBe("light");
		expect(
			screen.getByRole("button", { name: "Switch to dark mode" }),
		).toBeInTheDocument();
	});

	it("starts from the scheme saved by an earlier visit", () => {
		localStorage.setItem("color-scheme", "light");
		render(<ThemeToggle />);

		expect(
			screen.getByRole("button", { name: "Switch to dark mode" }),
		).toBeInTheDocument();
	});
});
