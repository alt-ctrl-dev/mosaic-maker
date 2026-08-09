import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceImageSelection } from "./SourceImageSelection";

// Mock canvas APIs for Vitest environment
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
	drawImage: vi.fn(),
	fillRect: vi.fn(),
	measureText: vi.fn().mockReturnValue({ width: 0 }),
}));

// Mock FileReader to avoid async issues in tests
const mockFileReader = {
	readAsDataURL: vi.fn().mockImplementation(function (this: FileReader) {
		setTimeout(() => {
			// @ts-expect-error - mock implementation
			this.onload?.({ target: { result: "data:image/png;base64,test" } });
		}, 0);
	}),
};

vi.stubGlobal(
	"FileReader",
	vi.fn(() => mockFileReader),
);

// Mock URL.createObjectURL to avoid memory leaks
vi.stubGlobal("URL", {
	createObjectURL: vi.fn().mockReturnValue("blob:test"),
	revokeObjectURL: vi.fn(),
});

describe("SourceImageSelection state persistence", () => {
	it("shows preview when initialState contains source image", () => {
		const mockInitialState = {
			sourceImage: {
				file: new File([], "test.png", { type: "image/png" }),
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
			sourceImageError: null,
			currentStep: 0,
			furthestCompletedStep: 0,
			requestedTesseraSize: null,
			adjustedTesseraSize: null,
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
			<SourceImageSelection
				onSourceSelected={vi.fn()}
				onSourceError={vi.fn()}
				initialState={mockInitialState}
			/>,
		);

		// Should show the image preview
		expect(screen.getByAltText("Source")).toBeInTheDocument();
		expect(
			screen.getByText("Dimensions: 100 × 100 pixels"),
		).toBeInTheDocument();
	});

	it("shows error when initialState contains source image error", () => {
		const mockInitialState = {
			sourceImage: null,
			sourceImageError: "Test error message",
			currentStep: 0,
			furthestCompletedStep: 0,
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
			<SourceImageSelection
				onSourceSelected={vi.fn()}
				onSourceError={vi.fn()}
				initialState={mockInitialState}
			/>,
		);

		// Should show the error message
		expect(screen.getByText("Test error message")).toBeInTheDocument();
	});
});
