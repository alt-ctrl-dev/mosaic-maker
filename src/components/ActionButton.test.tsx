import { render, screen } from "@testing-library/react";
import { ActionButton } from "./ActionButton";

describe("shared action buttons", () => {
	it("keeps native button behavior and composes StyleX variants with caller classes", () => {
		render(
			<>
				<ActionButton
					type="button"
					disabled
					className="save"
					variant="secondary"
				>
					Save
				</ActionButton>
				<ActionButton type="button" variant="outline">
					Cancel
				</ActionButton>
			</>,
		);
		const save = screen.getByRole("button", { name: "Save" });
		const cancel = screen.getByRole("button", { name: "Cancel" });
		expect(save).toBeDisabled();
		expect(save).toHaveClass("save");
		expect(cancel.className).not.toBe("");
		expect(save.className.replace("save ", "")).not.toBe(cancel.className);
	});
});
