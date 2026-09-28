import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GenerateAndPreview } from "./GenerateAndPreview";
import * as mosaicEngine from "../engine/mosaic-engine";
import { INITIAL_WORKFLOW_STATE, WorkflowStep } from "../engine/workflow-state";
import type { WorkflowState } from "../engine/workflow-state";

class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();

	constructor() {
		currentWorker = this;
	}

	emitError(message: string) {
		this.onmessage?.({ data: { type: "error", message } } as MessageEvent);
	}
}

let currentWorker: MockWorker | null = null;

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
		vi.stubGlobal("Worker", class {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("shows a user-friendly error and marks generation failed when the main-thread fallback fails", async () => {
		const generateMosaic = vi
			.spyOn(mosaicEngine, "generateMosaic")
			.mockRejectedValue(new Error("main-thread failure"));

		render(<GenerateAndPreview state={mockState} dispatch={mockDispatch} />);

		fireEvent.click(screen.getByRole("button", { name: "Generate Mosaic" }));

		await waitFor(() => {
			expect(currentWorker).not.toBeNull();
		});

		currentWorker?.emitError("ANDROID_READBACK_FAILURE: readback unsupported");

		await waitFor(() => {
			expect(
				screen.getByText(/Unable to generate mosaic on your device/i),
			).toBeInTheDocument();
		});

		expect(generateMosaic).toHaveBeenCalled();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "generationCancelledOrFailed",
		});
		expect(
			screen.queryByRole("button", { name: "Cancel" }),
		).not.toBeInTheDocument();
	});
});
