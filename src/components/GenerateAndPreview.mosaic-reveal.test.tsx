import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	currentStepAtom,
	furthestCompletedStepAtom,
	mosaicResultAtom,
} from "../atoms/workflow-atoms";
import * as mosaicEngine from "../engine/mosaic-engine";
import { WorkflowStep } from "../engine/workflow-state";
import { renderWithWorkflow } from "../test-utils/workflow";
import { GenerateAndPreview } from "./GenerateAndPreview";

vi.mock("../telemetry", async () => {
	const actual = await vi.importActual("../telemetry");
	return {
		...actual,
		trackMosaicGeneration: vi.fn(),
		vibrate: vi.fn(),
	};
});

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
	const mockState = {
		currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
		furthestCompletedStep: WorkflowStep.GENERATE_AND_PREVIEW,
		sourceImage: mockSourceImage,
		tesserae: mockTesserae,
		requestedTesseraSize: 10,
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

		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker to force main-thread generation path
		delete window.Worker;

		try {
			// Complete through the real atoms so the test fails if mosaic
			// generation incorrectly advances currentStep.
			const { store } = renderWithWorkflow(<GenerateAndPreview />, mockState);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});

			await screen.findByAltText("Generated mosaic");
			expect(screen.getByAltText("Generated mosaic")).toBeInTheDocument();

			expect(store.get(mosaicResultAtom)).toEqual(mockResult);

			// The atoms must keep currentStep at GENERATE_AND_PREVIEW
			// the export panel appears on this same step.
			expect(store.get(currentStepAtom)).toBe(
				WorkflowStep.GENERATE_AND_PREVIEW,
			);
			expect(store.get(furthestCompletedStepAtom)).toBe(
				WorkflowStep.GENERATE_AND_PREVIEW,
			);
		} finally {
			window.Worker = originalWorker;
		}
	});
});
