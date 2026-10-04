import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mosaicEngine from "../engine/mosaic-engine";
import type { WorkflowState } from "../engine/workflow-state";
import * as telemetry from "../telemetry";
import { GenerateAndPreview } from "./GenerateAndPreview";

vi.mock("../telemetry", async () => {
	const actual = await vi.importActual("../telemetry");
	return {
		...actual,
		trackMosaicGeneration: vi.fn(),
	};
});

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
		currentStep: 2,
		furthestCompletedStep: 2,
		mode: "photomosaic",
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

	it("reports elapsed time since Generate was clicked for a main-thread mosaic", async () => {
		const mockResult = {
			dataUrl: "result-data-url",
			width: 100,
			height: 100,
		};
		let finish!: (result: typeof mockResult) => void;
		vi.spyOn(mosaicEngine, "generateMosaic").mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		vi.spyOn(performance, "now").mockReturnValue(100);

		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker
		delete window.Worker;

		try {
			render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});
			vi.spyOn(performance, "now").mockReturnValue(1120);
			await act(async () => finish(mockResult));

			expect(telemetry.trackMosaicGeneration).toHaveBeenCalledWith(
				true,
				1020,
				100,
				100,
				10,
				"photomosaic",
				"main_thread",
				"worker_unavailable",
			);
		} finally {
			window.Worker = originalWorker;
		}
	});

	it("should track generation timing for failed main thread generation", async () => {
		vi.spyOn(mosaicEngine, "generateMosaic").mockRejectedValue(
			new Error("Test error"),
		);

		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker
		delete window.Worker;

		try {
			render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

			const generateButton = await screen.findByText("Generate Mosaic");
			await act(async () => {
				generateButton.click();
			});

			await screen.findByText("Test error");

			expect(telemetry.trackMosaicGeneration).toHaveBeenCalledWith(
				false,
				expect.any(Number),
				100,
				100,
				10,
				"photomosaic",
				"main_thread",
				"worker_unavailable",
			);
		} finally {
			window.Worker = originalWorker;
		}
	});

	it("reports main-thread cancellation only once with elapsed time", async () => {
		let finish!: (
			result: Awaited<ReturnType<typeof mosaicEngine.generateMosaic>>,
		) => void;
		vi.spyOn(mosaicEngine, "generateMosaic").mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		vi.spyOn(performance, "now").mockReturnValue(100);
		const originalWorker = window.Worker;
		// @ts-expect-error - intentionally removing Worker
		delete window.Worker;
		try {
			render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
			await act(async () =>
				screen.getByRole("button", { name: "Generate Mosaic" }).click(),
			);
			vi.spyOn(performance, "now").mockReturnValue(140);
			await act(async () =>
				screen.getByRole("button", { name: "Cancel" }).click(),
			);
			expect(telemetry.trackMosaicGeneration).toHaveBeenCalledWith(
				false,
				40,
				100,
				100,
				10,
				"photomosaic",
				"main_thread",
				"worker_unavailable",
			);
			await act(async () =>
				finish({ dataUrl: "late", width: 100, height: 100 }),
			);
			expect(telemetry.trackMosaicGeneration).toHaveBeenCalledTimes(1);
		} finally {
			window.Worker = originalWorker;
		}
	});
});
