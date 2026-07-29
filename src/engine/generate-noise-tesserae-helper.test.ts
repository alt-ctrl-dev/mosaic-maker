import { describe, expect, it } from "vitest";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";
import type { WorkflowState } from "./workflow-state";

/**
 * Minimal in-memory canvas stub, since jsdom does not implement a 2D context.
 */
function createFakeCanvas(width: number, height: number): HTMLCanvasElement {
	const context = {
		createImageData: (w: number, h: number) => ({
			width: w,
			height: h,
			data: new Uint8ClampedArray(w * h * 4),
		}),
		putImageData: () => {},
	};

	return {
		width,
		height,
		getContext: () => context,
		toDataURL: () => "data:image/png;base64,",
	} as unknown as HTMLCanvasElement;
}

describe("generateNoiseTesseraeFromState", () => {
	it("generates tesserae based on workflow state", async () => {
		const mockState: WorkflowState = {
			currentStep: 0,
			sourceImage: {
				width: 100,
				height: 100,
				orientation: 1,
			},
			requestedTesseraSize: 10,
			adjustedTesseraSize: 10,
			isCoarseGrid: false,
			hasValidSourceDimensions: true,
			sourceImageError: null,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: null,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png",
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		const tesserae = await generateNoiseTesseraeFromState(
			mockState,
			createFakeCanvas,
		);

		// Should generate the recommended count (10% of 100 cells = 10, capped at 100 = 10)
		expect(tesserae).toHaveLength(10);
		expect(tesserae[0].isValid).toBe(true);
	});

	it("uses explicit count when provided", async () => {
		const mockState: WorkflowState = {
			currentStep: 0,
			sourceImage: {
				width: 100,
				height: 100,
				orientation: 1,
			},
			requestedTesseraSize: 10,
			adjustedTesseraSize: 10,
			isCoarseGrid: false,
			hasValidSourceDimensions: true,
			sourceImageError: null,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: 5,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png",
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		const tesserae = await generateNoiseTesseraeFromState(
			mockState,
			createFakeCanvas,
		);

		// Should generate exactly 5 tesserae
		expect(tesserae).toHaveLength(5);
	});

	it("throws error when source image is missing", async () => {
		const mockState: WorkflowState = {
			currentStep: 0,
			sourceImage: null,
			requestedTesseraSize: 10,
			adjustedTesseraSize: 10,
			isCoarseGrid: false,
			hasValidSourceDimensions: true,
			sourceImageError: null,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: null,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png",
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		await expect(generateNoiseTesseraeFromState(mockState)).rejects.toThrow(
			"Source image and adjusted tessera size are required",
		);
	});

	it("throws error when adjusted tessera size is missing", async () => {
		const mockState: WorkflowState = {
			currentStep: 0,
			sourceImage: {
				width: 100,
				height: 100,
				orientation: 1,
			},
			requestedTesseraSize: 10,
			adjustedTesseraSize: null,
			isCoarseGrid: false,
			hasValidSourceDimensions: true,
			sourceImageError: null,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: null,
			needsRegeneration: false,
			mosaicResult: null,
			exportAltText: "",
			exportFormat: "png",
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		await expect(generateNoiseTesseraeFromState(mockState)).rejects.toThrow(
			"Source image and adjusted tessera size are required",
		);
	});
});
