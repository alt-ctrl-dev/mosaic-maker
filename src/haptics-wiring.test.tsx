import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { vibrate } from "./haptics";
import { renderWithWorkflow } from "./test-utils/workflow";

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

beforeEach(() => {
	vi.mocked(vibrate).mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("haptic feedback at workflow milestones", () => {
	it("vibrates briefly when the source image loads", async () => {
		renderWithWorkflow(<SourceImageSelection />);

		const input = screen.getByLabelText("Select source image");
		fireEvent.change(input, {
			target: { files: [new File(["x"], "source.png", { type: "image/png" })] },
		});

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(10));
	});

	it("vibrates briefly when tesserae finish processing", async () => {
		renderWithWorkflow(<TesseraUpload />);

		const input = screen.getByLabelText("Upload tile images");
		fireEvent.change(input, {
			target: {
				files: [new File(["x"], "tessera.png", { type: "image/png" })],
			},
		});

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(15));
	});

	it("vibrates briefly when generated tiles are ready", async () => {
		renderWithWorkflow(<GeneratedTesserae />, {
			seed: 42,
			generatedTesseraCount: 20,
		});

		fireEvent.click(screen.getByRole("button", { name: /generate tiles/i }));

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith(15));
	});

	it("vibrates a success pattern when the mosaic finishes generating", async () => {
		renderWithWorkflow(<GenerateAndPreview />, {
			mode: "photomosaic",
			sourceImage: {
				url: "blob:test",
				width: 100,
				height: 100,
				orientation: 1,
			},
			adjustedTesseraSize: 10,
			tesserae: [
				{
					fileName: "tessera.png",
					isValid: true,
					error: null,
					isLowResolution: false,
					previewUrl: null,
				},
			],
		});

		fireEvent.click(screen.getByRole("button", { name: /generate mosaic/i }));

		await waitFor(() => expect(vibrate).toHaveBeenCalledWith([30, 50, 30]));
	});
});
