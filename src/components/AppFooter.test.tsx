import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppFooter } from "./AppFooter";

vi.mock("../version", () => ({
	VERSION_STRING: "v1.0.0+abc1234",
	PACKAGE_VERSION: "1.0.0",
	COMMIT_SHA: "abc1234",
}));

describe("AppFooter", () => {
	it("renders a centered footer with the version string", () => {
		render(<AppFooter />);

		const footer = screen.getByText(/Mosaic Maker v1\.0\.0\+abc1234/);
		expect(footer).toBeInTheDocument();
		expect(footer.tagName).toBe("FOOTER");
		expect(footer).toHaveStyle("text-align: center");
		expect(footer).toHaveStyle("padding: 1rem");
	});
});
