import { render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog";

vi.mock("../telemetry", () => ({
	trackEvent: vi.fn(),
}));

describe("Dialog mobile adaptations", () => {
	it("shows visible text label on mobile toggle button", () => {
		render(
			<Dialog dialogId="mobile-workflow-menu" ariaLabel="Toggle workflow steps">
				<div>Test content</div>
			</Dialog>,
		);

		// Should contain visible text "Steps" in the first toggle button
		const buttons = screen.getAllByText("Steps");
		expect(buttons).toHaveLength(2);
		expect(buttons[0]).toBeInTheDocument();
	});
});
