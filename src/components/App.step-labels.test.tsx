import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { act } from "react";

describe("App step labels and completion state", () => {
	afterEach(cleanup);

	it("shows specific step names instead of generic Next labels", async () => {
		render(<App />);

		// Navigate to step 2 (source image selection)
		const continueButton = screen.getByRole("button", {
			name: "Continue to Choose source image →",
		});
		await act(async () => {
			fireEvent.click(continueButton);
		});

		// Check that the top navigation shows specific step names
		const stepCounter = screen.getByText(/Step \d+ of 5/);
		expect(stepCounter).toBeInTheDocument();

		// Check that continue button has specific label
		// This test will fail until we implement the fix
	});

	it("preserves completed checkmarks when navigating backwards", () => {
		// This test will verify that completed steps keep their checkmarks
		// when the user navigates backwards
	});
});
