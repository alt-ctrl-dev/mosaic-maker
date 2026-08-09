import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TesseraSizeSelection } from "./TesseraSizeSelection";

describe("TesseraSizeSelection state persistence", () => {
	it("initializes slider value from initialState.requestedTesseraSize", () => {
		const mockInitialState = {
			sourceImage: {
				file: new File([], "test.png", { type: "image/png" }),
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
			sourceImageError: null,
			currentStep: 1,
			furthestCompletedStep: 1,
			requestedTesseraSize: 32,
			adjustedTesseraSize: 32,
			isCoarseGrid: false,
			hasValidSourceDimensions: true,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			seed: null,
			generatedTesseraCount: null,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png" as const,
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		render(
			<TesseraSizeSelection
				onSizeSelected={vi.fn()}
				initialState={mockInitialState}
			/>,
		);

		// Should show the requested size in the slider
		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("32");

		// Should show the adjusted size info
		expect(screen.getByText("Adjusted size:")).toBeInTheDocument();
		expect(
			screen.getByText("32px", { selector: "strong" }),
		).toBeInTheDocument();
	});

	it("uses default value of 16 when no requestedTesseraSize in initialState", () => {
		const mockInitialState = {
			sourceImage: null,
			sourceImageError: null,
			currentStep: 1,
			furthestCompletedStep: 1,
			requestedTesseraSize: null,
			adjustedTesseraSize: null,
			isCoarseGrid: false,
			hasValidSourceDimensions: false,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			seed: null,
			generatedTesseraCount: null,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png" as const,
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		render(
			<TesseraSizeSelection
				onSizeSelected={vi.fn()}
				initialState={mockInitialState}
			/>,
		);

		// Should show the default value in the slider
		const slider = screen.getByRole("slider");
		expect(slider).toHaveValue("16");
	});
});
