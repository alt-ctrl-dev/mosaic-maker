import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mosaicEngine from "../engine/mosaic-engine";
import type { WorkflowState } from "../engine/workflow-state";
import { RecordingTelemetryAdapter } from "../telemetry-recording-adapter";
import { setTelemetry } from "../telemetry-service";
import { GenerateAndPreview } from "./GenerateAndPreview";

vi.mock("../engine/mosaic-engine", () => ({
	generateMosaic: vi.fn(),
}));

describe("GenerateAndPreview Timing", () => {
	const mockDispatch = vi.fn();
	let recordingAdapter: RecordingTelemetryAdapter;

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
		recordingAdapter = new RecordingTelemetryAdapter();
		setTelemetry(recordingAdapter);
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

			const mosaicEvents =
				recordingAdapter.getEventsByName("mosaic_generation");
			expect(mosaicEvents).toHaveLength(1);
			expect(mosaicEvents[0].payload).toEqual({
				sessionId: "test-session-id",
				appVersion: "test-version",
				success: "true",
				duration: "1020",
				sourceWidth: "100",
				sourceHeight: "100",
				tesseraSize: "10",
				mode: "photomosaic",
				executionPath: "main_thread",
				fallbackReason: "worker_unavailable",
			});
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

			const mosaicEvents =
				recordingAdapter.getEventsByName("mosaic_generation");
			expect(mosaicEvents).toHaveLength(1);
			expect(mosaicEvents[0].payload.success).toBe("false");
			expect(mosaicEvents[0].payload.sourceWidth).toBe("100");
			expect(mosaicEvents[0].payload.sourceHeight).toBe("100");
			expect(mosaicEvents[0].payload.tesseraSize).toBe("10");
			expect(mosaicEvents[0].payload.mode).toBe("photomosaic");
			expect(mosaicEvents[0].payload.executionPath).toBe("main_thread");
			expect(mosaicEvents[0].payload.fallbackReason).toBe("worker_unavailable");
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
			const mosaicEvents =
				recordingAdapter.getEventsByName("mosaic_generation");
			expect(mosaicEvents).toHaveLength(1);
			expect(mosaicEvents[0].payload.success).toBe("false");
			expect(mosaicEvents[0].payload.duration).toBe("40");

			await act(async () =>
				finish({ dataUrl: "late", width: 100, height: 100 }),
			);
			// Still only one event — late completions after cancel don't emit
			expect(
				recordingAdapter.getEventsByName("mosaic_generation"),
			).toHaveLength(1);
		} finally {
			window.Worker = originalWorker;
		}
	});
});
