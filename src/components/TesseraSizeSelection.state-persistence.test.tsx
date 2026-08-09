import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { INITIAL_WORKFLOW_STATE } from "../engine/workflow-state";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

describe("TesseraSizeSelection state persistence", () => {
	it("initializes slider value from initialState.requestedTesseraSize", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={vi.fn()}
				initialState={{
					...INITIAL_WORKFLOW_STATE,
					sourceImage: {
						url: "blob:test",
						width: 100,
						height: 100,
						orientation: 1,
					},
					hasValidSourceDimensions: true,
					requestedTesseraSize: 32,
					adjustedTesseraSize: 32,
				}}
			/>,
		);

		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("32");
		expect(screen.getByText("Adjusted size:")).toBeInTheDocument();
		expect(
			screen.getByText("32px", { selector: "strong" }),
		).toBeInTheDocument();
	});

	it("uses default value of 16 when no requestedTesseraSize in initialState", () => {
		render(
			<TesseraSizeSelection
				onSizeSelected={vi.fn()}
				initialState={INITIAL_WORKFLOW_STATE}
			/>,
		);

		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("16");
	});
});
