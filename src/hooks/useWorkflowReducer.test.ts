import { describe, expect, it } from "vitest";
import type { SourceImageInfo } from "../engine/image-processing";
import {
	INITIAL_WORKFLOW_STATE,
	type TesseraInfo,
	WorkflowStep,
} from "../engine/workflow-state";
import { workflowReducer } from "./useWorkflowReducer";

function makeSourceImage(): SourceImageInfo {
	return {
		width: 640,
		height: 480,
		orientation: 1,
		url: "blob:source",
	};
}

function makeTessera(fileName: string, isValid: boolean): TesseraInfo {
	return {
		file: new File([], fileName, { type: "image/png" }),
		fileName,
		isValid,
		error: null,
		isLowResolution: false,
		previewUrl: null,
	};
}

describe("workflowReducer", () => {
	it("advances to build tesserae on a sourceSelected action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceSelected",
			sourceImage: makeSourceImage(),
		});

		expect(next.sourceImage).not.toBeNull();
		expect(next.currentStep).toBe(WorkflowStep.BUILD_TESSERAE);
	});

	it("records a source error on a sourceError action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceError",
			errorMessage: "boom",
		});

		expect(next.sourceImageError).toBe("boom");
		expect(next.sourceImage).toBeNull();
	});

	it("stores the adjusted size on a sizeSelected action", () => {
		const withSource = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceSelected",
			sourceImage: makeSourceImage(),
		});

		const next = workflowReducer(withSource, {
			type: "sizeSelected",
			size: 16,
		});

		expect(next.adjustedTesseraSize).not.toBeNull();
		expect(next.currentStep).toBe(WorkflowStep.BUILD_TESSERAE);
	});

	it("counts valid and rejected tesserae on a tesseraeProcessed action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "tesseraeProcessed",
			tesserae: [
				makeTessera("tessera1.png", true),
				makeTessera("tessera2.png", false),
			],
		});

		expect(next.validTesseraCount).toBe(1);
		expect(next.rejectedTesseraCount).toBe(1);
		expect(next.currentStep).toBe(WorkflowStep.BUILD_TESSERAE);
	});

	it("appends to the collection on a tesseraeGenerated action", () => {
		// Start with existing tesserae
		const initialState = {
			...INITIAL_WORKFLOW_STATE,
			tesserae: [makeTessera("existing1.jpg", true)],
			validTesseraCount: 1,
			totalTesseraCount: 1,
		};

		const next = workflowReducer(initialState, {
			type: "tesseraeGenerated",
			tesserae: [
				makeTessera("generated1.jpg", true),
				makeTessera("generated2.jpg", true),
			],
		});

		// Should append instead of replace
		expect(next.totalTesseraCount).toBe(3); // 1 existing + 2 new
		expect(next.tesserae).toHaveLength(3);
		expect(next.tesserae[0].fileName).toBe("existing1.jpg");
		expect(next.tesserae[1].fileName).toBe("generated1.jpg");
		expect(next.tesserae[2].fileName).toBe("generated2.jpg");
		expect(next.needsRegeneration).toBe(false);
	});

	it("removes a tessera at the given index on a removeTessera action", () => {
		const withTesserae = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "tesseraeProcessed",
			tesserae: [
				makeTessera("tessera1.png", true),
				makeTessera("tessera2.png", false),
			],
		});

		const next = workflowReducer(withTesserae, {
			type: "removeTessera",
			index: 0,
		});

		expect(next.totalTesseraCount).toBe(1);
		expect(next.validTesseraCount).toBe(0);
	});

	it("advances from review to generate-and-preview on an advanceFromReview action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "advanceFromReview",
		});

		expect(next.currentStep).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
		expect(next.furthestCompletedStep).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
	});

	it("does not allow goToStep to jump ahead of furthest completed step", () => {
		// Advance to step 1 (BUILD_TESSERAE)
		const stateAtStep1 = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceSelected",
			sourceImage: makeSourceImage(),
		});

		// Try to jump to step 3 (GENERATE_AND_PREVIEW) - should stay at step 1
		const next = workflowReducer(stateAtStep1, {
			type: "goToStep",
			step: WorkflowStep.GENERATE_AND_PREVIEW,
		});

		expect(next.currentStep).toBe(WorkflowStep.BUILD_TESSERAE);
		expect(next.currentStep).toBe(stateAtStep1.furthestCompletedStep);
	});

	it("allows goToStep to go back to a previously completed step", () => {
		// Advance to step 1 (BUILD_TESSERAE)
		const stateAtStep1 = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceSelected",
			sourceImage: makeSourceImage(),
		});

		// Go back to step 0 (CHOOSE_SOURCE_IMAGE)
		const next = workflowReducer(stateAtStep1, {
			type: "goToStep",
			step: WorkflowStep.CHOOSE_SOURCE_IMAGE,
		});

		expect(next.currentStep).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
		expect(next.furthestCompletedStep).toBe(WorkflowStep.BUILD_TESSERAE);
		expect(next.currentStep).toBeLessThan(next.furthestCompletedStep);
	});
});
