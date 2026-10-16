import { fireEvent, render, screen } from "@testing-library/react";
import { OptionalButton } from "./OptionalButton";

describe("OptionalButton", () => {
	it("renders its children as a button", () => {
		render(<OptionalButton type="button">Add random tiles</OptionalButton>);
		expect(
			screen.getByRole("button", { name: "Add random tiles" }),
		).toBeInTheDocument();
	});

	it("fires onClick", () => {
		const onClick = vi.fn();
		render(
			<OptionalButton type="button" onClick={onClick}>
				Do it
			</OptionalButton>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Do it" }));

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});
