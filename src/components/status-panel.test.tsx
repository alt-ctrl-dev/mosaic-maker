import {
	cleanup,
	fireEvent,
	type RenderResult,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkflowState } from "../engine/workflow-state";
import { tokens } from "../styles/tokens.stylex";
import { declaredValuesFor } from "../test-utils/style-inspection";
import { GenerateAndPreview } from "./GenerateAndPreview";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { SourceImageSelection } from "./SourceImageSelection";
import { TesseraReview } from "./TesseraReview";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import { TesseraUpload } from "./TesseraUpload";

// Status panels share the StyleX card style rather than declaring
// background-color or color themselves. These tests mock the
// async engine calls so the transient status panels stay mounted long enough to
// inspect their rendered elements.
vi.mock("../engine/image-processing", async () => {
	const actual = await vi.importActual<
		typeof import("../engine/image-processing")
	>("../engine/image-processing");
	return {
		...actual,
		// Never resolves, so the "processing-indicator" panel stays mounted.
		getSourceImageInfo: () => new Promise(() => {}),
	};
});

vi.mock("../engine/tessera-processing", () => ({
	// Never resolves, so the "processing-indicator" panel stays mounted.
	processTesserae: () => new Promise(() => {}),
}));

vi.mock("../engine/generate-noise-tesserae-helper", () => ({
	// Never resolves, so the "generation-info" panel stays mounted.
	generateNoiseTesseraeFromState: () => new Promise(() => {}),
}));

vi.mock("../engine/mosaic-engine", () => ({
	// Never resolves, so the "generation-progress" panel stays mounted.
	generateMosaic: () => new Promise(() => {}),
}));

afterEach(cleanup);

/**
 * Asserts that a status panel uses the shared StyleX card style and does not
 * declare its own background-color or color inline.
 */
function expectUsesSharedPanelStyling(element: Element): void {
	expect(element.tagName).toBe("ARTICLE");

	const inlineStyle = (element as HTMLElement).style;
	expect(inlineStyle.backgroundColor).toBe("");
	expect(inlineStyle.color).toBe("");

	expect(declaredValuesFor(element, "background-color")).toContain(
		tokens.surface,
	);
	expect(declaredValuesFor(element, "color")).toEqual([]);
}

const noop = () => {};

describe("Status panels use the shared card styling", () => {
	it("SourceImageSelection error panel uses the shared card style", () => {
		const state = {
			sourceImageError: "Something went wrong",
		} as unknown as WorkflowState;

		const { container } = render(
			<SourceImageSelection
				onSourceSelected={noop}
				onSourceError={noop}
				initialState={state}
			/>,
		);

		const panel = container.querySelector(".error-message");
		expect(panel).not.toBeNull();
		expectUsesSharedPanelStyling(panel as Element);
	});

	it("SourceImageSelection processing panel uses the shared card style", async () => {
		const state = { sourceImageError: null } as unknown as WorkflowState;

		const { container } = render(
			<SourceImageSelection
				onSourceSelected={noop}
				onSourceError={noop}
				initialState={state}
			/>,
		);

		const input = screen.getByLabelText("Select source image");
		const file = new File(["x"], "source.png", { type: "image/png" });
		fireEvent.change(input, { target: { files: [file] } });

		const panel = await waitFor(() => {
			const found = container.querySelector(".processing-indicator");
			expect(found).not.toBeNull();
			return found as Element;
		});
		expectUsesSharedPanelStyling(panel);
	});

	it("TesseraUpload processing panel uses the shared card style", async () => {
		const { container } = render(
			<TesseraUpload onTesseraeProcessed={noop} adjustedTesseraSize={16} />,
		);

		const input = screen.getByLabelText("Upload tesserae images");
		const file = new File(["x"], "tessera.png", { type: "image/png" });
		fireEvent.change(input, { target: { files: [file] } });

		const panel = await waitFor(() => {
			const found = container.querySelector(".processing-indicator");
			expect(found).not.toBeNull();
			return found as Element;
		});
		expectUsesSharedPanelStyling(panel);
	});

	it("GeneratedTesserae generation panel uses the shared card style", async () => {
		const state = {
			seed: 42,
			generatedTesseraCount: 20,
		} as unknown as WorkflowState;

		const { container } = render(
			<GeneratedTesserae onTesseraeGenerated={noop} initialState={state} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /generate tiles/i }));

		const panel = await waitFor(() => {
			const found = container.querySelector(".generation-info");
			expect(found).not.toBeNull();
			return found as Element;
		});
		expectUsesSharedPanelStyling(panel);
	});

	it("GenerateAndPreview progress panel uses the shared card style", async () => {
		const state = {
			sourceImage: { url: "blob:test", width: 100, height: 100 },
			adjustedTesseraSize: 10,
			tesserae: [{ isValid: true } as unknown],
		} as unknown as WorkflowState;

		const { container } = render(
			<GenerateAndPreview state={state} dispatch={noop} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /generate mosaic/i }));

		const panel = await waitFor(() => {
			const found = container.querySelector(".generation-progress");
			expect(found).not.toBeNull();
			return found as Element;
		});
		expectUsesSharedPanelStyling(panel);
	});

	it("TesseraReview warning panel uses the shared card style", () => {
		const { container } = render(
			<TesseraReview
				tesserae={[]}
				onRemoveTessera={noop}
				isLowVariety
				varietyRecommendation={20}
			/>,
		);

		const panel = container.querySelector(".warning-message");
		expect(panel).not.toBeNull();
		expectUsesSharedPanelStyling(panel as Element);
	});

	it("TesseraSizeSelection warning panel uses the shared card style", async () => {
		const state = {
			sourceImage: { url: "blob:test", width: 20, height: 20 },
			hasValidSourceDimensions: true,
		} as unknown as WorkflowState;

		const { container }: RenderResult = render(
			<TesseraSizeSelection onSizeSelected={noop} initialState={state} />,
		);

		const slider = screen.getByRole("slider");
		fireEvent.change(slider, { target: { value: "20" } });

		const panel = await waitFor(() => {
			const found = container.querySelector(".warning-message");
			expect(found).not.toBeNull();
			return found as Element;
		});
		expectUsesSharedPanelStyling(panel);
	});
});
