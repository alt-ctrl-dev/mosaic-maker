import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
	it("renders its children", () => {
		render(<Badge>(Optional)</Badge>);
		expect(screen.getByText("(Optional)")).toBeInTheDocument();
	});

	it("merges a custom className", () => {
		render(<Badge className="custom">New</Badge>);
		expect(screen.getByText("New")).toHaveClass("custom");
	});
});
