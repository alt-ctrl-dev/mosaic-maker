import { describe, expect, it } from "vitest";
import {
	hasValidTesseraSizes,
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
} from "../engine/tessera-sizing";
import {
	updateWorkflowWithSourceImage,
	WorkflowStep,
} from "../engine/workflow-state";
import type { WorkflowState } from "../engine/workflow-state";

describe("Issue #123: Allow partial edge cells", () => {
	it("should accept 476x600 image that previously failed due to no common divisors >= 8", () => {
		// This is the exact example from the issue:
		// 476 = 2^2 x 7 x 17, 600 = 2^3 x 3 x 5^2, so gcd(476, 600) = 4
		// Every common divisor (1, 2, 4) is below the 8-pixel floor

		const width = 476;
		const height = 600;

		// Before the fix, this would return false
		// After the fix, this should return true because both dimensions >= 8
		expect(hasValidTesseraSizes(width, height)).toBe(true);

		// Should be able to calculate adjusted tessera sizes
		const adjustedSize = calculateAdjustedTesseraSize(10, width, height);
		expect(adjustedSize).toBe(10); // 10 is within valid range [8, 476]

		// Grid cell count should use ceiling division
		const cellCount = calculateGridCellCount(10, width, height);
		// ceil(476/10) * ceil(600/10) = 48 * 60 = 2880
		expect(cellCount).toBe(2880);
	});

	it("should reject images with dimensions less than 8 pixels", () => {
		// Images with either dimension < 8 should still be rejected
		expect(hasValidTesseraSizes(5, 100)).toBe(false);
		expect(hasValidTesseraSizes(100, 5)).toBe(false);
		expect(hasValidTesseraSizes(5, 5)).toBe(false);

		// But images with both dimensions >= 8 should be accepted
		expect(hasValidTesseraSizes(8, 8)).toBe(true);
		expect(hasValidTesseraSizes(100, 100)).toBe(true);
	});

	it("should work with the workflow state update", () => {
		// Test that the workflow accepts the 476x600 image
		// Test that the workflow accepts the 476x600 image
		const initialState: WorkflowState = {
			currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
			furthestCompletedStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
			sourceImage: null,
			hasValidSourceDimensions: false,
			sourceImageError: null,
			requestedTesseraSize: null,
			adjustedTesseraSize: null,
			isCoarseGrid: false,
			tesserae: [],
			validTesseraCount: 0,
			rejectedTesseraCount: 0,
			totalTesseraCount: 0,
			isLowVarietyCollection: false,
			varietyRecommendation: null,
			hasAcceptedSupplementation: false,
			seed: null,
			generatedTesseraCount: null,
			mosaicResult: null,
			needsRegeneration: false,
			exportFormat: "png",
			exportQuality: 0.9,
			exportBackgroundColor: "#ffffff",
		};

		const sourceImageInfo = {
			url: "data:image/png;base64,test",
			width: 476,
			height: 600,
			orientation: 1,
		};

		const newState = updateWorkflowWithSourceImage(
			initialState,
			sourceImageInfo,
		);

		// Should accept the image
		expect(newState.hasValidSourceDimensions).toBe(true);
		expect(newState.sourceImageError).toBeNull();
		// Should advance to the BUILD_TESSERAE step
		expect(newState.currentStep).toBeGreaterThan(0);
	});
});
