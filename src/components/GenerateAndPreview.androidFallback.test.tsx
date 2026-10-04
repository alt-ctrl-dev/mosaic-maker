import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mosaicEngine from "../engine/mosaic-engine";
import { ANDROID_READBACK_FAILURE } from "../engine/mosaic-shared";
import type { WorkflowState } from "../engine/workflow-state";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";
import { GenerateAndPreview } from "./GenerateAndPreview";

class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();

	constructor() {
		if (failWorkerInit) throw new Error("worker init failed");
		currentWorker = this;
	}

	emitError(message: string) {
		this.onmessage?.({ data: { type: "error", message } } as MessageEvent);
	}
}

let currentWorker: MockWorker | null = null;
let failWorkerInit = false;

vi.mock("../engine/mosaic-worker.ts?worker", () => ({
	default: MockWorker,
}));

const mockDispatch = vi.fn();

const mockState: WorkflowState = {
	...INITIAL_WORKFLOW_STATE,
	currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
	sourceImage: {
		width: 100,
		height: 100,
		orientation: 1,
		url: "blob:mock-source",
	},
	adjustedTesseraSize: 10,
	tesserae: [
		{
			file: new File([], "tessera.png"),
			fileName: "tessera.png",
			isValid: true,
			error: null,
			isLowResolution: false,
			previewUrl: "blob:mock-tessera",
		},
	],
};

describe("GenerateAndPreview Android readback fallback", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		currentWorker = null;
		failWorkerInit = false;
		vi.stubGlobal("Worker", class {});
		vi.stubEnv("VITE_FARO_URL", "");
		vi.stubEnv("VITE_FARO_APP_NAME", "");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	function generationEvents(log: ReturnType<typeof vi.spyOn>) {
		return log.mock.calls
			.filter(([name]: unknown[]) => name === "[Telemetry] mosaic_generation:")
			.map(([, payload]: unknown[]) => JSON.parse(payload as string));
	}

	it("attributes completed worker generation to the worker with click-to-result duration", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		await waitFor(() => expect(currentWorker).not.toBeNull());
		vi.spyOn(performance, "now").mockReturnValue(350);
		currentWorker?.onmessage?.({
			data: { type: "result", dataUrl: "data:mock", width: 100, height: 100 },
		} as MessageEvent);
		expect(generationEvents(log)).toMatchObject([
			{ success: "true", duration: "250", executionPath: "worker" },
		]);
		expect(generationEvents(log)[0]).not.toHaveProperty("fallbackReason");
	});

	it("attributes worker errors and cancellations to the worker", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		await waitFor(() => expect(currentWorker).not.toBeNull());
		vi.spyOn(performance, "now").mockReturnValue(250);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(generationEvents(log)).toMatchObject([
			{ success: "false", duration: "150", executionPath: "worker" },
		]);
		expect(generationEvents(log)[0]).not.toHaveProperty("fallbackReason");
	});

	it("attributes non-Android worker errors to the worker", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		await waitFor(() => expect(currentWorker).not.toBeNull());
		vi.spyOn(performance, "now").mockReturnValue(190);
		currentWorker?.emitError("generation failed");
		expect(generationEvents(log)).toMatchObject([
			{ success: "false", duration: "90", executionPath: "worker" },
		]);
		expect(generationEvents(log)[0]).not.toHaveProperty("fallbackReason");
	});

	it("reports worker init failure as an unavailable-worker fallback", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		failWorkerInit = true;
		vi.spyOn(mosaicEngine, "generateMosaic").mockResolvedValue({
			dataUrl: "data:mock",
			width: 100,
			height: 100,
		});
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		vi.spyOn(performance, "now").mockReturnValue(360);
		await waitFor(() => expect(generationEvents(log)).toHaveLength(1));
		expect(generationEvents(log)).toMatchObject([
			{
				success: "true",
				duration: "260",
				executionPath: "main_thread",
				fallbackReason: "worker_unavailable",
			},
		]);
	});

	it("includes the failed worker attempt in Android fallback duration", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		let finish!: (
			value: Awaited<ReturnType<typeof mosaicEngine.generateMosaic>>,
		) => void;
		vi.spyOn(mosaicEngine, "generateMosaic").mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		await waitFor(() => expect(currentWorker).not.toBeNull());
		vi.spyOn(performance, "now").mockReturnValue(250);
		currentWorker?.emitError(
			`${ANDROID_READBACK_FAILURE}: readback unsupported`,
		);
		vi.spyOn(performance, "now").mockReturnValue(510);
		await finish({ dataUrl: "data:mock", width: 100, height: 100 });
		await waitFor(() => expect(generationEvents(log)).toHaveLength(1));
		expect(generationEvents(log)).toMatchObject([
			{
				success: "true",
				duration: "410",
				executionPath: "main_thread",
				fallbackReason: "android_readback",
			},
		]);
	});

	it("reports Android fallback cancellation once, not a late success", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		let finish!: (
			value: Awaited<ReturnType<typeof mosaicEngine.generateMosaic>>,
		) => void;
		vi.spyOn(mosaicEngine, "generateMosaic").mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		vi.spyOn(performance, "now").mockReturnValue(100);
		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);
		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));
		await waitFor(() => expect(currentWorker).not.toBeNull());
		currentWorker?.emitError(
			`${ANDROID_READBACK_FAILURE}: readback unsupported`,
		);
		vi.spyOn(performance, "now").mockReturnValue(270);
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(generationEvents(log)).toMatchObject([
			{
				success: "false",
				duration: "170",
				executionPath: "main_thread",
				fallbackReason: "android_readback",
			},
		]);
		await finish({ dataUrl: "late", width: 100, height: 100 });
		await waitFor(() => expect(generationEvents(log)).toHaveLength(1));
	});

	it("shows a user-friendly error and marks generation failed when the main-thread fallback fails", async () => {
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const generateMosaic = vi
			.spyOn(mosaicEngine, "generateMosaic")
			.mockRejectedValue(new Error("main-thread failure"));

		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));

		await waitFor(() => {
			expect(currentWorker).not.toBeNull();
		});

		currentWorker?.emitError(
			`${ANDROID_READBACK_FAILURE}: readback unsupported`,
		);

		await waitFor(() => {
			expect(
				screen.getByText(/Unable to generate mosaic on your device/i),
			).toBeInTheDocument();
		});

		expect(generationEvents(log)).toMatchObject([
			{
				success: "false",
				executionPath: "main_thread",
				fallbackReason: "android_readback",
			},
		]);
		expect(generateMosaic).toHaveBeenCalled();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "generationCancelledOrFailed",
		});
		expect(
			screen.queryByRole("button", { name: "Cancel" }),
		).not.toBeInTheDocument();
	});
});
