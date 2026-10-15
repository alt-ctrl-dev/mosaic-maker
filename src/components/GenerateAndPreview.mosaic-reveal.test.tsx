import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mosaicEngine from "../engine/mosaic-engine";
import {
	INITIAL_WORKFLOW_STATE,
	type WorkflowState,
	WorkflowStep,
} from "../engine/workflow-state";
import { workflowReducer } from "../hooks/useWorkflowReducer";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";
import { GenerateAndPreview } from "./GenerateAndPreview";

vi.mock("../engine/mosaic-engine", () => ({
	generateMosaic: vi.fn(),
}));

describe("GenerateAndPreview Mosaic Reveal", () => {
	const mockSourceImage = {
		url: "test-image-url",
		width: 100,
		height: 100,
		orientation: 1,
	};
	const mockTesserae = [
		{
			fileName: "test1.jpg",
			isValid: true,
			previewUrl: "test-preview-1",
			file: new File([], "test1.jpg", { type: "image/jpeg" }),
			error: null,
			isLowResolution: false,
		},
	];
	const mockState: WorkflowState = {
		...INITIAL_WORKFLOW_STATE,
		currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
		furthestCompletedStep: WorkflowStep.GENERATE_AND_PREVIEW,
		sourceImage: mockSourceImage,
		tesserae: mockTesserae,
		requestedTesseraSize: 10,
		adjustedTesseraSize: 10,
		hasValidSourceDimensions: true,
		validTesseraCount: 1,
		totalTesseraCount: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("shows the mosaic preview after generation without advancing currentStep", async () => {
		const mockResult = {
			dataUrl: "result-data-url",
			width: 100,
			height: 100,
		};

		vi.spyOn(mosaicEngine, "generateMosaic").mockResolvedValue(mockResult);

		// Dispatch through the real reducer so the test fails if
		// mosaicGenerated incorrectly advances currentStep.
		let resolvedState = mockState;
		const dispatch = vi.fn((action: WorkflowAction) => {
			resolvedState = workflowReducer(resolvedState, action);
		});

		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker to force main-thread generation path
		delete window.Worker;

		try {
			render(<GenerateAndPreview state={mockState} dispatch={dispatch} />);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});

			await screen.findByAltText("Generated mosaic preview");
			expect(
				screen.getByAltText("Generated mosaic preview"),
			).toBeInTheDocument();

			expect(dispatch).toHaveBeenCalledWith({
				type: "mosaicGenerated",
				mosaicResult: mockResult,
			});

			// The real reducer must keep currentStep at GENERATE_AND_PREVIEW
			// and advance only furthestCompletedStep to EXPORT_MOSAIC.
			expect(resolvedState.currentStep).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
			expect(resolvedState.furthestCompletedStep).toBe(
				WorkflowStep.EXPORT_MOSAIC,
			);
		} finally {
			window.Worker = originalWorker;
		}
	});

	it("allows explicit continue action to advance to export after generation", () => {
		const postGenerationState: WorkflowState = {
			...mockState,
			furthestCompletedStep: WorkflowStep.EXPORT_MOSAIC,
		};

		const nextState = workflowReducer(postGenerationState, {
			type: "goToStep",
			step: WorkflowStep.EXPORT_MOSAIC,
		});

		expect(nextState.currentStep).toBe(WorkflowStep.EXPORT_MOSAIC);
	});
});
