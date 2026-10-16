import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
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
 * Returns the thumbnail image element from the bar below the mode
 * switcher, rather than the source-image preview in step content.
 */
function queryThumbnailBar(): HTMLDivElement | null {
	return document.querySelector('[data-testid="source-thumbnail-bar"]');
}

function queryBarThumbnail(): HTMLImageElement | null {
	const bar = queryThumbnailBar();
	if (!bar) return null;
	return within(bar).queryByAltText("Source");
}

describe("Source Thumbnail Persistence", () => {
	it("shows source thumbnail and dimensions below the switcher after source selection", () => {
		renderWithState(makeAdjustedState(WorkflowStep.BUILD_TESSERAE));

		const thumbnail = queryBarThumbnail();
		expect(thumbnail).toBeInTheDocument();
		expect(thumbnail).toHaveAttribute("src", "blob:source");

		const bar = queryThumbnailBar();
		expect(bar).not.toBeNull();
		if (!bar) throw new Error("thumbnail bar not found");
		expect(within(bar).getByText("640 × 480 pixels")).toBeInTheDocument();
	});

	it("hides thumbnail when no source image is selected", () => {
		renderWithState({});

		expect(queryBarThumbnail()).not.toBeInTheDocument();
	});

	it("hides thumbnail on the source image selection step itself", () => {
		renderWithState(makeAdjustedState(WorkflowStep.CHOOSE_SOURCE_IMAGE));

		expect(queryBarThumbnail()).not.toBeInTheDocument();
	});

	it("shows thumbnail on tessera size step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.BUILD_TESSERAE));

		expect(queryBarThumbnail()).toBeInTheDocument();
	});

	it("shows thumbnail on generate and preview step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.GENERATE_AND_PREVIEW));

		expect(queryBarThumbnail()).toBeInTheDocument();
	});

	it("shows thumbnail on export step", () => {
		renderWithState(makeAdjustedState(WorkflowStep.EXPORT_MOSAIC));

		expect(queryBarThumbnail()).toBeInTheDocument();
	});

	it("returns to source selection when the change button is clicked", () => {
		renderWithState(makeAdjustedState(WorkflowStep.BUILD_TESSERAE));

		const bar = queryThumbnailBar();
		expect(bar).not.toBeNull();
		if (!bar) throw new Error("thumbnail bar not found");

		fireEvent.click(
			within(bar).getByRole("button", { name: /change source image/i }),
		);

		// The bar hides on the source step, and the drop zone is live again.
		expect(queryThumbnailBar()).not.toBeInTheDocument();
		expect(
			screen.getByLabelText("Tap or click here to choose a source image"),
		).toBeInTheDocument();
	});
});
