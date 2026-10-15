import { cleanup, render, within } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { WorkflowApp } from "../App";
import { createWorkflowStore } from "../atoms/workflow-atoms";
import type { SourceImageInfo } from "../engine/image-processing";
import type { WorkflowState } from "../engine/workflow-state";
import { WorkflowStep } from "../engine/workflow-state";

afterEach(cleanup);

function makeSourceImage(
	overrides?: Partial<SourceImageInfo>,
): SourceImageInfo {
	return {
		width: 640,
		height: 480,
		orientation: 1,
		url: "blob:source",
		...overrides,
	};
}

function makeAdjustedState(step: WorkflowStep): Partial<WorkflowState> {
	return {
		sourceImage: makeSourceImage(),
		currentStep: step,
		furthestCompletedStep: step,
	};
}

/** Render WorkflowApp with a pre-seeded workflow state. */
function renderWithState(state: Partial<WorkflowState>) {
	const store = createWorkflowStore(state);
	return render(
		<Provider store={store}>
			<WorkflowApp />
		</Provider>,
	);
}

/**
 * Returns the header thumbnail image element, scoped to the page
 * header rather than the source-image preview in step content.
 */
function queryHeaderThumbnail(): HTMLImageElement | null {
	const header = document.querySelector("header");
	if (!header) return null;
	return within(header).queryByAltText("Source");
}

describe("Source Thumbnail Persistence", () => {
	it("shows source thumbnail and dimensions in header after source selection", () => {
		renderWithState(makeAdjustedState(WorkflowStep.BUILD_TESSERAE));

		const thumbnail = queryHeaderThumbnail();
		expect(thumbnail).toBeInTheDocument();
		expect(thumbnail).toHaveAttribute("src", "blob:source");

		const header = document.querySelector("header");
		expect(header).not.toBeNull();
		if (!header) throw new Error("header not found");
		expect(within(header).getByText("640 × 480 pixels")).toBeInTheDocument();
	});

	it("hides thumbnail when no source image is selected", () => {
		renderWithState({});

		expect(queryHeaderThumbnail()).not.toBeInTheDocument();
	});

	it("hides thumbnail on the source image selection step itself", () => {
		renderWithState(makeAdjustedState(WorkflowStep.CHOOSE_SOURCE_IMAGE));

		expect(queryHeaderThumbnail()).not.toBeInTheDocument();
	});

	it("shows thumbnail on tessera size step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.BUILD_TESSERAE));

		expect(queryHeaderThumbnail()).toBeInTheDocument();
	});

	it("shows thumbnail on generate and preview step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.GENERATE_AND_PREVIEW));

		expect(queryHeaderThumbnail()).toBeInTheDocument();
	});

	it("shows thumbnail on export step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.EXPORT_MOSAIC));

		expect(queryHeaderThumbnail()).toBeInTheDocument();
	});
});
