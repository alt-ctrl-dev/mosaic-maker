import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { GenerateAndPreview } from "./GenerateAndPreview";
import * as analytics from "../analytics";
import * as mosaicEngine from "../engine/mosaic-engine";
import type { WorkflowState } from "../engine/workflow-state";

// Mock the analytics module
vi.mock("../analytics", async () => {
	const actual = await vi.importActual("../analytics");
	return {
		...actual,
		track: vi.fn(),
		getSessionId: vi.fn().mockReturnValue("test-session-id"),
	};
});

// Mock the mosaic engine
vi.mock("../engine/mosaic-engine", () => ({
	generateMosaic: vi.fn(),
}));

describe("GenerateAndPreview Timing", () => {
	const mockDispatch = vi.fn();
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
		{
			fileName: "test2.jpg",
			isValid: true,
			previewUrl: "test-preview-2",
			file: new File([], "test2.jpg", { type: "image/jpeg" }),
			error: null,
			isLowResolution: false,
		},
	];
	const mockState: WorkflowState = {
		currentStep: 2, // WorkflowStep.GENERATE_AND_PREVIEW
		furthestCompletedStep: 2,
		sourceImage: mockSourceImage,
		tesserae: mockTesserae,
		requestedTesseraSize: 10,
		adjustedTesseraSize: 10,
		isCoarseGrid: false,
		hasValidSourceDimensions: true,
		sourceImageError: null,
		validTesseraCount: 2,
		rejectedTesseraCount: 0,
		totalTesseraCount: 2,
		isLowVarietyCollection: false,
		varietyRecommendation: null,
		hasAcceptedSupplementation: false,
		seed: null,
		generatedTesseraCount: null,
		needsRegeneration: false,
		mosaicResult: null,
		exportFormat: "png",
		exportQuality: 0.9,
		exportBackgroundColor: "#ffffff",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("should track timing for successful main thread generation", async () => {
		const mockResult = {
			dataUrl: "result-data-url",
			width: 100,
			height: 100,
		};

		// Mock generateMosaic to resolve successfully
		vi.spyOn(mosaicEngine, "generateMosaic").mockResolvedValue(mockResult);

		// Mock Worker to be undefined to force main thread execution
		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker
		delete window.Worker;

		try {
			render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});

			// Check that track was called with timing information
			expect(analytics.track).toHaveBeenCalledWith(
				"mosaic_generation",
				expect.objectContaining({
					outcome: "completed",
					totalTime: expect.any(Number),
					phases: expect.any(Object),
					sessionId: "test-session-id",
					gridCellCount: expect.any(Number),
					tesseraCount: expect.any(Number),
					outputPixels: expect.any(Number),
					estimatedMemoryUsage: expect.any(Number),
				}),
			);
		} finally {
			// Restore Worker
			window.Worker = originalWorker;
		}
	});

	it("should track timing for failed main thread generation", async () => {
		// Mock generateMosaic to reject with an error
		vi.spyOn(mosaicEngine, "generateMosaic").mockRejectedValue(
			new Error("Test error"),
		);

		// Mock Worker to be undefined to force main thread execution
		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker
		delete window.Worker;

		try {
			render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});

			// Wait for the error to be displayed
			await screen.findByText("Test error");

			// Check that track was called with timing information for failure
			expect(analytics.track).toHaveBeenCalledWith(
				"mosaic_generation",
				expect.objectContaining({
					outcome: "failed",
					totalTime: expect.any(Number),
					phases: expect.any(Object),
					sessionId: "test-session-id",
					gridCellCount: expect.any(Number),
					tesseraCount: expect.any(Number),
					outputPixels: expect.any(Number),
					estimatedMemoryUsage: expect.any(Number),
				}),
			);
		} finally {
			// Restore Worker
			window.Worker = originalWorker;
		}
	});
});
