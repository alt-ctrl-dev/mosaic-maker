import { describe, expect, it } from "vitest";
import { generateNoiseTesseraeFromState } from "./generate-noise-tesserae-helper";
import type { WorkflowState } from "./workflow-state";

function mockState(overrides: Partial<WorkflowState> = {}): WorkflowState {
	return {
		currentStep: 0,
		sourceImage: { width: 100, height: 100, orientation: 1 },
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
		...overrides,
	};
}

describe("generateNoiseTesseraeFromState", () => {
	it("generates tesserae based on workflow state", async () => {
		const tesserae = await generateNoiseTesseraeFromState(mockState());

		expect(tesserae).toHaveLength(10);
		expect(tesserae[0].isValid).toBe(true);
	});

	it("uses explicit count when provided", async () => {
		const tesserae = await generateNoiseTesseraeFromState(
			mockState({ generatedTesseraCount: 5 }),
		);

		expect(tesserae).toHaveLength(5);
	});

	it("throws error when source image is missing", async () => {
		await expect(
			generateNoiseTesseraeFromState(mockState({ sourceImage: null })),
		).rejects.toThrow("Source image and adjusted tessera size are required");
	});
});
