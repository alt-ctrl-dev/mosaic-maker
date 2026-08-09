import { describe, it, expect } from "vitest";
import {
	INITIAL_WORKFLOW_STATE,
	updateWorkflowWithTesserae,
	updateWorkflowWithSupplementedTesserae,
	updateWorkflowWithSourceImage,
	updateWorkflowWithTesseraSize,
} from "./workflow-state";
import type { SourceImageInfo } from "./image-processing";

describe("workflow-state supplement functionality", () => {
	const mockSourceImage: SourceImageInfo = {
		url: "data:image/png;base64,",
		width: 200,
		height: 100,
		orientation: 1,
	};

	it("should supplement tesserae with generated ones and mark them as supplemented", () => {
		// Set up initial state with source image and tessera size
		let state = updateWorkflowWithSourceImage(
			INITIAL_WORKFLOW_STATE,
			mockSourceImage,
		);
		state = updateWorkflowWithTesseraSize(state, 10);

		// Add some initial tesserae
		const initialTesserae = [
			{
				file: new File([], "test1.png"),
				fileName: "test1.png",
				isValid: true,
				error: null,
				isLowResolution: false,
				previewUrl: null,
			},
		];
		state = updateWorkflowWithTesserae(state, initialTesserae);

		// Create supplemented tesserae
		const supplementedTesserae = [
			{
				file: new File([], "generated1.png"),
				fileName: "generated1.png",
				isValid: true,
				error: null,
				isLowResolution: false,
				previewUrl: null,
				isSupplemented: true, // Mark as supplemented
			},
			{
				file: new File([], "generated2.png"),
				fileName: "generated2.png",
				isValid: true,
				error: null,
				isLowResolution: false,
				previewUrl: null,
				isSupplemented: true, // Mark as supplemented
			},
		];

		// Apply supplementation
		const newState = updateWorkflowWithSupplementedTesserae(
			state,
			supplementedTesserae,
		);

		// Verify supplemented tesserae are added
		expect(newState.tesserae).toHaveLength(3);
		expect(newState.tesserae[0]).toEqual(initialTesserae[0]);
		expect(newState.tesserae[1]).toEqual(supplementedTesserae[0]);
		expect(newState.tesserae[2]).toEqual(supplementedTesserae[1]);

		// Verify all tesserae are marked correctly
		expect(newState.tesserae[0].isSupplemented).toBeFalsy();
		expect(newState.tesserae[1].isSupplemented).toBe(true);
		expect(newState.tesserae[2].isSupplemented).toBe(true);

		// Verify variety metrics are updated
		expect(newState.validTesseraCount).toBe(3);
		expect(newState.hasAcceptedSupplementation).toBe(true);
	});
});
