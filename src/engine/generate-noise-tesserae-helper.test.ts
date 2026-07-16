import { describe, expect, it } from "vitest";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";
import type { WorkflowState } from "./workflow-state";

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
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: null,
			needsRegeneration: false,
		};

		const tesserae = await generateNoiseTesseraeFromState(mockState);

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
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: 5,
			needsRegeneration: false,
		};

		const tesserae = await generateNoiseTesseraeFromState(mockState);

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
			useGeneratedTesserae: true,
			seed: 12345,
			generatedTesseraCount: null,
			needsRegeneration: false,
		};

		await expect(generateNoiseTesseraeFromState(mockState)).rejects.toThrow(
			"Source image and adjusted tessera size are required",
		);
	});
});
