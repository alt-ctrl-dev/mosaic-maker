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
	};
}

function makeTessera(isValid: boolean): TesseraInfo {
	return {
		file: new File([], "tessera.png", { type: "image/png" }),
		fileName: "tessera.png",
		isValid,
		error: null,
		isLowResolution: false,
		previewUrl: null,
	};
}

describe("workflowReducer", () => {
	it("advances to tessera sizing on a sourceSelected action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "sourceSelected",
			sourceImage: makeSourceImage(),
		});

		expect(next.sourceImage).not.toBeNull();
		expect(next.currentStep).toBe(WorkflowStep.SET_TESSERA_SIZE);
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
		expect(next.currentStep).toBe(WorkflowStep.CHOOSE_TESSERAE);
	});

	it("counts valid and rejected tesserae on a tesseraeProcessed action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "tesseraeProcessed",
			tesserae: [makeTessera(true), makeTessera(false)],
		});

		expect(next.validTesseraCount).toBe(1);
		expect(next.rejectedTesseraCount).toBe(1);
		expect(next.currentStep).toBe(WorkflowStep.REVIEW_TESSERAE);
	});

	it("replaces the collection on a tesseraeGenerated action", () => {
		const next = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "tesseraeGenerated",
			tesserae: [makeTessera(true), makeTessera(true)],
		});

		expect(next.totalTesseraCount).toBe(2);
		expect(next.needsRegeneration).toBe(false);
	});

	it("removes a tessera at the given index on a removeTessera action", () => {
		const withTesserae = workflowReducer(INITIAL_WORKFLOW_STATE, {
			type: "tesseraeProcessed",
			tesserae: [makeTessera(true), makeTessera(false)],
		});

		const next = workflowReducer(withTesserae, {
			type: "removeTessera",
			index: 0,
		});

		expect(next.totalTesseraCount).toBe(1);
		expect(next.validTesseraCount).toBe(0);
	});
});
