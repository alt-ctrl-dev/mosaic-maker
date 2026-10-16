import { describe, expect, it, vi } from "vitest";
import type { SourceImageInfo } from "../engine/image-processing";
import {
	createBrickTesserae,
	type TesseraInfo,
	WorkflowStep,
} from "../engine/workflow-state";
import {
	adjustedTesseraSizeAtom,
	advanceFromReviewAtom,
	advanceFromSizeAtom,
	appendGeneratedTesseraeAtom,
	clearTesseraeAtom,
	commitTesseraSizeAtom,
	completeMosaicAtom,
	createWorkflowStore,
	currentStepAtom,
	discardMosaicAtom,
	furthestCompletedStepAtom,
	goToStepAtom,
	hasAcceptedSupplementationAtom,
	isCoarseGridAtom,
	isLowVarietyCollectionAtom,
	modeAtom,
	mosaicResultAtom,
	rejectedTesseraCountAtom,
	removeTesseraAtom,
	replaceTesseraeAtom,
	reportSourceErrorAtom,
	requestedTesseraSizeAtom,
	selectModeAtom,
	selectSourceImageAtom,
	sourceImageAtom,
	sourceImageErrorAtom,
	tesseraeAtom,
	totalTesseraCountAtom,
	validTesseraCountAtom,
	varietyRecommendationAtom,
} from "./workflow-atoms";

function makeSourceImage(): SourceImageInfo {
	return {
		width: 640,
		height: 480,
		orientation: 1,
		url: "blob:source",
	};
}

function makeTessera(fileName: string, isValid = true): TesseraInfo {
	return {
		file: new File([], fileName, { type: "image/png" }),
		fileName,
		isValid,
		error: null,
		isLowResolution: false,
		previewUrl: null,
	};
}

describe("workflow atoms", () => {
	it("advances to tile size selection when a valid source image is selected", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());

		expect(store.get(sourceImageAtom)).not.toBeNull();
		expect(store.get(sourceImageErrorAtom)).toBeNull();
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.PICK_TILE_SIZE);
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.PICK_TILE_SIZE,
		);
	});

	it("keeps the step and records an error for an undersized source image", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, {
			width: 5,
			height: 5,
			orientation: 1,
			url: "blob:tiny",
		});

		expect(store.get(sourceImageAtom)).not.toBeNull();
		expect(store.get(sourceImageErrorAtom)).toContain("too small");
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
	});

	it("clears the source image when a source error is reported", () => {
		const store = createWorkflowStore();
		store.set(reportSourceErrorAtom, "boom");

		expect(store.get(sourceImageErrorAtom)).toBe("boom");
		expect(store.get(sourceImageAtom)).toBeNull();
	});

	it("derives the adjusted size once a size is committed", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());
		store.set(commitTesseraSizeAtom, 16);

		expect(store.get(requestedTesseraSizeAtom)).toBe(16);
		expect(store.get(adjustedTesseraSizeAtom)).toBe(16);
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.PICK_TILE_SIZE);
	});

	it("clears existing tesserae when a new size is committed", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());
		store.set(replaceTesseraeAtom, [makeTessera("tile.png")]);
		store.set(commitTesseraSizeAtom, 24);

		expect(store.get(requestedTesseraSizeAtom)).toBe(24);
		expect(store.get(tesseraeAtom)).toEqual([]);
	});

	it("discards a generated mosaic when the size changes", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());
		store.set(replaceTesseraeAtom, [makeTessera("tile.png")]);
		store.set(completeMosaicAtom, {
			dataUrl: "data:image/png;base64,x",
			width: 10,
			height: 10,
		});

		store.set(commitTesseraSizeAtom, 24);

		expect(store.get(mosaicResultAtom)).toBeNull();
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.GENERATE_AND_PREVIEW,
		);
	});

	it("ignores a committed size without a valid source image", () => {
		const store = createWorkflowStore();
		store.set(commitTesseraSizeAtom, 16);

		expect(store.get(requestedTesseraSizeAtom)).toBe(16);
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
	});

	it("counts valid and rejected tesserae as derived state", () => {
		const store = createWorkflowStore();
		store.set(replaceTesseraeAtom, [
			makeTessera("tessera1.png", true),
			makeTessera("tessera2.png", false),
		]);

		expect(store.get(validTesseraCountAtom)).toBe(1);
		expect(store.get(rejectedTesseraCountAtom)).toBe(1);
		expect(store.get(totalTesseraCountAtom)).toBe(2);
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.PICK_TILES);
	});

	it("keeps uploaded tesserae and replaces generated ones when appending generated", () => {
		const store = createWorkflowStore({
			tesserae: [
				makeTessera("uploaded1.png"),
				{ ...makeTessera("generated1.png"), isSupplemented: true },
			],
		});

		store.set(appendGeneratedTesseraeAtom, [
			makeTessera("generated2.png"),
			makeTessera("generated3.png"),
		]);

		const tesserae = store.get(tesseraeAtom);
		expect(tesserae).toHaveLength(3);
		expect(tesserae[0].fileName).toBe("uploaded1.png");
		expect(tesserae[1].fileName).toBe("generated2.png");
		expect(tesserae[2].fileName).toBe("generated3.png");
	});

	it("removes a tessera at the given index", () => {
		const store = createWorkflowStore({
			tesserae: [
				makeTessera("tessera1.png", true),
				makeTessera("tessera2.png", false),
			],
		});

		store.set(removeTesseraAtom, 0);

		expect(store.get(totalTesseraCountAtom)).toBe(1);
		expect(store.get(validTesseraCountAtom)).toBe(0);
	});

	it("ignores out-of-bounds removal", () => {
		const store = createWorkflowStore({
			tesserae: [makeTessera("tessera1.png")],
		});

		store.set(removeTesseraAtom, 5);

		expect(store.get(totalTesseraCountAtom)).toBe(1);
	});

	it("clears all tesserae", () => {
		const store = createWorkflowStore({
			tesserae: [makeTessera("tessera1.png")],
		});

		store.set(clearTesseraeAtom);

		expect(store.get(tesseraeAtom)).toHaveLength(0);
		expect(store.get(totalTesseraCountAtom)).toBe(0);
	});

	it("stores the mosaic result and unlocks export without advancing the step", () => {
		const store = createWorkflowStore({
			currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
			furthestCompletedStep: WorkflowStep.GENERATE_AND_PREVIEW,
		});
		const mosaicResult = { dataUrl: "data:test", width: 100, height: 100 };

		store.set(completeMosaicAtom, mosaicResult);

		expect(store.get(mosaicResultAtom)).toEqual(mosaicResult);
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.GENERATE_AND_PREVIEW,
		);
	});

	it("discards the mosaic result on cancellation or failure", () => {
		const store = createWorkflowStore({
			mosaicResult: { dataUrl: "data:test", width: 1, height: 1 },
		});

		store.set(discardMosaicAtom);

		expect(store.get(mosaicResultAtom)).toBeNull();
	});

	it("starts at the source image step and blocks forward navigation", () => {
		const store = createWorkflowStore();

		store.set(goToStepAtom, WorkflowStep.PICK_TILE_SIZE);

		expect(store.get(currentStepAtom)).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
	});

	it("allows navigation back to a previously completed step", () => {
		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());

		store.set(goToStepAtom, WorkflowStep.CHOOSE_SOURCE_IMAGE);

		expect(store.get(currentStepAtom)).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.PICK_TILE_SIZE,
		);
	});

	it("advances from size selection to tile picking", () => {
		const store = createWorkflowStore();

		store.set(advanceFromSizeAtom);

		expect(store.get(currentStepAtom)).toBe(WorkflowStep.PICK_TILES);
		expect(store.get(furthestCompletedStepAtom)).toBe(WorkflowStep.PICK_TILES);
	});

	it("advances from review to generate-and-preview", () => {
		const store = createWorkflowStore();

		store.set(advanceFromReviewAtom);

		expect(store.get(currentStepAtom)).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.GENERATE_AND_PREVIEW,
		);
	});

	it("resets the tessera collection when the mode changes", () => {
		const store = createWorkflowStore({
			tesserae: [makeTessera("tessera1.png")],
			mosaicResult: { dataUrl: "data:test", width: 1, height: 1 },
		});

		store.set(selectModeAtom, "brick");

		expect(store.get(modeAtom)).toBe("brick");
		expect(store.get(tesseraeAtom)).toHaveLength(0);
		expect(store.get(mosaicResultAtom)).toBeNull();
		expect(store.get(hasAcceptedSupplementationAtom)).toBe(false);
	});

	it("keeps the collection when the same mode is selected again", () => {
		const store = createWorkflowStore({
			tesserae: [makeTessera("tessera1.png")],
		});

		store.set(selectModeAtom, "photomosaic");

		expect(store.get(tesseraeAtom)).toHaveLength(1);
	});

	it("returns to tile selection when the mode changes on a later step", () => {
		const store = createWorkflowStore({
			currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
			furthestCompletedStep: WorkflowStep.GENERATE_AND_PREVIEW,
			tesserae: [makeTessera("tessera1.png")],
			mosaicResult: { dataUrl: "data:test", width: 1, height: 1 },
		});

		store.set(selectModeAtom, "brick");

		// The new mode needs its own tiles; the generate step would strand
		// the user with no tiles and no way back.
		expect(store.get(currentStepAtom)).toBe(WorkflowStep.PICK_TILES);
		expect(store.get(furthestCompletedStepAtom)).toBe(
			WorkflowStep.PICK_TILE_SIZE,
		);
	});

	describe("variety metrics by mode", () => {
		const sourceState = {
			sourceImage: {
				width: 1000,
				height: 1000,
				orientation: 1,
				url: "blob:source",
			},
			requestedTesseraSize: 16,
		};

		it("flags low variety in photomosaic mode", () => {
			const store = createWorkflowStore(sourceState);
			store.set(replaceTesseraeAtom, [makeTessera("only.jpg")]);

			expect(store.get(varietyRecommendationAtom)).not.toBeNull();
			expect(store.get(isLowVarietyCollectionAtom)).toBe(true);
		});

		it("never flags low variety in brick mode", () => {
			const store = createWorkflowStore({
				...sourceState,
				mode: "brick",
			});
			store.set(replaceTesseraeAtom, createBrickTesserae(["#FF0000"]));

			expect(store.get(varietyRecommendationAtom)).toBeNull();
			expect(store.get(isLowVarietyCollectionAtom)).toBe(false);
		});
	});

	it("derives the coarse-grid warning from the committed size", () => {
		const store = createWorkflowStore({
			sourceImage: {
				width: 20,
				height: 20,
				orientation: 1,
				url: "blob:source",
			},
		});

		store.set(commitTesseraSizeAtom, 20);

		expect(store.get(isCoarseGridAtom)).toBe(true);
	});

	it("tracks step navigation telemetry", async () => {
		const telemetry = await import("../telemetry");
		const trackEvent = vi.spyOn(telemetry, "trackEvent");

		const store = createWorkflowStore();
		store.set(selectSourceImageAtom, makeSourceImage());
		trackEvent.mockClear();

		store.set(goToStepAtom, WorkflowStep.CHOOSE_SOURCE_IMAGE);

		expect(trackEvent).toHaveBeenCalledWith(
			"workflow_step_navigate",
			expect.objectContaining({
				fromStep: "pick_tile_size",
				toStep: "choose_source_image",
				isBackward: true,
			}),
		);

		trackEvent.mockRestore();
	});

	it("hydrates a store from a partial snapshot", () => {
		const store = createWorkflowStore({
			sourceImageError: "Something went wrong",
		});

		expect(store.get(sourceImageErrorAtom)).toBe("Something went wrong");
		expect(store.get(modeAtom)).toBe("photomosaic");
	});

	it("seeds requestedTesseraSize from the snapshot's adjusted size", () => {
		const store = createWorkflowStore({
			sourceImage: makeSourceImage(),
			adjustedTesseraSize: 24,
		});

		expect(store.get(requestedTesseraSizeAtom)).toBe(24);
		expect(store.get(adjustedTesseraSizeAtom)).toBe(24);
	});
});
