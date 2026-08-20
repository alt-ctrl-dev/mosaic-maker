import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	type RenderResult,
} from "@testing-library/react";
import { SourceImageSelection } from "./SourceImageSelection";
import { GenerateAndPreview } from "./GenerateAndPreview";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraReview } from "./TesseraReview";
import { TesseraSizeSelection } from "./TesseraSizeSelection";
import { TesseraUpload } from "./TesseraUpload";
import type { WorkflowState } from "../engine/workflow-state";

// Status panels must delegate their styling to Pico's <article> element rather
// than declaring background-color or color themselves. These tests mock the
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

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = styles;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(cleanup);

/**
 * Returns every CSS declaration for `property` that applies to `element`,
 * gathered by walking the injected stylesheet and matching selectors. jsdom's
 * getComputedStyle does not resolve `var()` references or full cascade, so the
 * raw declared values are inspected directly instead.
 */
function declaredValuesFor(element: Element, property: string): string[] {
	const values: string[] = [];
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSStyleRule)) continue;
			let matches = false;
			try {
				matches = element.matches(rule.selectorText);
			} catch {
				continue;
			}
			if (!matches) continue;
			const value = rule.style.getPropertyValue(property);
			if (value) values.push(value);
		}
	}
	return values;
}

/**
 * Asserts that a status panel is a Pico <article> and does not declare its own
 * background-color or color, either inline or via a matching CSS rule.
 */
function expectDelegatesStylingToArticle(element: Element): void {
	expect(element.tagName).toBe("ARTICLE");

	const inlineStyle = (element as HTMLElement).style;
	expect(inlineStyle.backgroundColor).toBe("");
	expect(inlineStyle.color).toBe("");

	expect(declaredValuesFor(element, "background-color")).toEqual([]);
	expect(declaredValuesFor(element, "color")).toEqual([]);
}

const noop = () => {};

describe("Status panels delegate styling to Pico article elements", () => {
	it("does not reference the nonexistent pico-contrast-color variable", () => {
		expect(styles).not.toContain("var(--pico-contrast-color)");
	});

	it("SourceImageSelection error panel is an unstyled article", () => {
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
		expectDelegatesStylingToArticle(panel as Element);
	});

	it("SourceImageSelection processing panel is an unstyled article", async () => {
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
		expectDelegatesStylingToArticle(panel);
	});

	it("TesseraUpload processing panel is an unstyled article", async () => {
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
		expectDelegatesStylingToArticle(panel);
	});

	it("GeneratedTesserae generation panel is an unstyled article", async () => {
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
		expectDelegatesStylingToArticle(panel);
	});

	it("GenerateAndPreview progress panel is an unstyled article", async () => {
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
		expectDelegatesStylingToArticle(panel);
	});

	it("TesseraReview warning panel is an unstyled article", () => {
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
		expectDelegatesStylingToArticle(panel as Element);
	});

	it("TesseraSizeSelection warning panel is an unstyled article", async () => {
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
		expectDelegatesStylingToArticle(panel);
	});
});
