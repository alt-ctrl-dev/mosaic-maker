import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "./engine/workflow-state";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { vibrate } from "./haptics";

vi.mock("./haptics", () => ({
	vibrate: vi.fn(),
}));

vi.mock("./engine/image-processing", async () => {
	const actual = await vi.importActual<
		typeof import("./engine/image-processing")
	>("./engine/image-processing");
	return {
		...actual,
		getSourceImageInfo: () =>
			Promise.resolve({ url: "blob:test", width: 100, height: 100 }),
	};
});

vi.mock("./engine/tessera-processing", () => ({
	processTesserae: () => Promise.resolve([]),
	resizeTesserae: () => Promise.resolve([]),
}));

vi.mock("./engine/generate-noise-tesserae-helper", () => ({
	generateNoiseTesseraeFromState: () => Promise.resolve([]),
}));

vi.mock("./engine/mosaic-engine", () => ({
	generateMosaic: () =>
		Promise.resolve({
			dataUrl: "data:image/png;base64,x",
			width: 10,
			height: 10,
		}),
}));

const noop = () => {};

beforeEach(() => {
	vi.mocked(vibrate).mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("haptic feedback at workflow milestones", () => {
	it("vibrates briefly when the source image loads", async () => {
		const state = { sourceImageError: null } as unknown as WorkflowState;
		render(
			<SourceImageSelection
				onSourceSelected={noop}
				onSourceError={noop}
				initialState={state}
			/>,
		);

		const input = screen.getByLabelText("Select source image");
		fireEvent.change(input, {
			target: { files: [new File(["x"], "source.png", { type: "image/png" })] },
		});

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(10));
	});

	it("vibrates briefly when tesserae finish processing", async () => {
		render(
			<TesseraUpload onTesseraeProcessed={noop} adjustedTesseraSize={16} />,
		);

		const input = screen.getByLabelText("Upload tesserae images");
		fireEvent.change(input, {
			target: {
				files: [new File(["x"], "tessera.png", { type: "image/png" })],
			},
		});

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(15));
	});

	it("vibrates briefly when generated tiles are ready", async () => {
		const state = {
			seed: 42,
			generatedTesseraCount: 20,
		} as unknown as WorkflowState;

		render(
			<GeneratedTesserae onTesseraeGenerated={noop} initialState={state} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /generate tiles/i }));

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(15));
	});

	it("vibrates a success pattern when the mosaic finishes generating", async () => {
		const state = {
			mode: "photomosaic",
			sourceImage: { url: "blob:test", width: 100, height: 100 },
			adjustedTesseraSize: 10,
			tesserae: [{ isValid: true }],
		} as unknown as WorkflowState;

		render(<GenerateAndPreview state={state} dispatch={noop} />);

		fireEvent.click(screen.getByRole("button", { name: /generate mosaic/i }));

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith([30, 50, 30]));
	});
});
