import { describe, expect, it } from "vitest";
import {
	checkLowVariety,
	getVarietyRecommendation,
	INITIAL_WORKFLOW_STATE,
	type MosaicResult,
	type TesseraInfo,
	updateWorkflowAdvanceFromReview,
	updateWorkflowExportSettings,
	updateWorkflowOnCancellationOrFailure,
	updateWorkflowOnRegeneration,
	updateWorkflowOnSourceReplacement,
	updateWorkflowOnTesseraSizeChange,
	updateWorkflowRemoveTessera,
	updateWorkflowToGeneratedMode,
	updateWorkflowToUploadMode,
	updateWorkflowWithGeneratedTesseraCount,
	updateWorkflowWithGeneratedTesserae,
	updateWorkflowWithMosaicResult,
	updateWorkflowWithNewSeed,
	updateWorkflowWithSeed,
	updateWorkflowWithSourceImage,
	updateWorkflowWithSourceImageError,
	updateWorkflowWithSupplementedTesserae,
	updateWorkflowWithTesserae,
	updateWorkflowWithTesseraSize,
	WorkflowStep,
} from "./workflow-state";

describe("workflow-state", () => {
	describe("INITIAL_WORKFLOW_STATE", () => {
		it("starts at the choose source image step", () => {
			expect(INITIAL_WORKFLOW_STATE.currentStep).toBe(
				WorkflowStep.CHOOSE_SOURCE_IMAGE,
			);
		});

		it("has no source image initially", () => {
			expect(INITIAL_WORKFLOW_STATE.sourceImage).toBeNull();
		});

		it("has no tessera size initially", () => {
			expect(INITIAL_WORKFLOW_STATE.requestedTesseraSize).toBeNull();
			expect(INITIAL_WORKFLOW_STATE.adjustedTesseraSize).toBeNull();
		});

		it("has no source image error initially", () => {
			expect(INITIAL_WORKFLOW_STATE.sourceImageError).toBeNull();
		});

		it("has empty tesserae collection initially", () => {
			expect(INITIAL_WORKFLOW_STATE.tesserae).toEqual([]);
			expect(INITIAL_WORKFLOW_STATE.validTesseraCount).toBe(0);
			expect(INITIAL_WORKFLOW_STATE.rejectedTesseraCount).toBe(0);
			expect(INITIAL_WORKFLOW_STATE.totalTesseraCount).toBe(0);
		});

		it("has no mosaic result initially", () => {
			expect(INITIAL_WORKFLOW_STATE.mosaicResult).toBeNull();
		});

		it("has default export settings", () => {
			expect(INITIAL_WORKFLOW_STATE.exportAltText).toBe("");
			expect(INITIAL_WORKFLOW_STATE.exportFormat).toBe("png");
			expect(INITIAL_WORKFLOW_STATE.exportQuality).toBe(0.9);
			expect(INITIAL_WORKFLOW_STATE.exportBackgroundColor).toBe("#ffffff");
		});
	});

	describe("updateWorkflowWithSourceImage", () => {
		it("updates state with source image information", () => {
			const sourceImage = {
				width: 800,
				height: 600,
				orientation: 1,
			};

			const newState = updateWorkflowWithSourceImage(
				INITIAL_WORKFLOW_STATE,
				sourceImage,
			);

			expect(newState.sourceImage).toEqual(sourceImage);
			expect(newState.hasValidSourceDimensions).toBe(true);
			expect(newState.sourceImageError).toBeNull();
			expect(newState.currentStep).toBe(WorkflowStep.SET_TESSERA_SIZE);
		});

		it("rejects images with no valid tessera sizes", () => {
			const sourceImage = {
				width: 11,
				height: 13,
				orientation: 1,
			};

			const newState = updateWorkflowWithSourceImage(
				INITIAL_WORKFLOW_STATE,
				sourceImage,
			);

			expect(newState.sourceImage).toEqual(sourceImage);
			expect(newState.hasValidSourceDimensions).toBe(false);
			expect(newState.sourceImageError).toContain("no valid tessera sizes");
			expect(newState.currentStep).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
		});
	});

	describe("updateWorkflowWithSourceImageError", () => {
		it("updates state with source image error", () => {
			const errorMessage = "Unsupported file type";
			const newState = updateWorkflowWithSourceImageError(
				INITIAL_WORKFLOW_STATE,
				errorMessage,
			);

			expect(newState.sourceImage).toBeNull();
			expect(newState.hasValidSourceDimensions).toBe(false);
			expect(newState.sourceImageError).toBe(errorMessage);
		});
	});

	describe("updateWorkflowWithTesseraSize", () => {
		it("updates state with adjusted tessera size", () => {
			const stateWithSource = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
			};

			const newState = updateWorkflowWithTesseraSize(stateWithSource, 15);

			expect(newState.requestedTesseraSize).toBe(15);
			expect(newState.adjustedTesseraSize).toBe(10); // 10 is closer to 15 than 20, with tie-breaking
		});

		it("detects coarse grids", () => {
			const stateWithSource = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
			};

			// With 50px tesserae on a 100x100 image = 2x2 grid = 4 cells (coarse)
			const newState = updateWorkflowWithTesseraSize(stateWithSource, 50);

			expect(newState.isCoarseGrid).toBe(true);
		});

		it("does not detect coarse grids when cell count is sufficient", () => {
			const stateWithSource = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
			};

			// With 10px tesserae on a 100x100 image = 10x10 grid = 100 cells (not coarse)
			const newState = updateWorkflowWithTesseraSize(stateWithSource, 10);

			expect(newState.isCoarseGrid).toBe(false);
		});

		it("does nothing when source image is not valid", () => {
			const newState = updateWorkflowWithTesseraSize(
				INITIAL_WORKFLOW_STATE,
				10,
			);

			expect(newState.requestedTesseraSize).toBeNull();
			expect(newState.adjustedTesseraSize).toBeNull();
		});

		it("advances to CHOOSE_TESSERAE step when successful", () => {
			const stateWithSource = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
			};

			const newState = updateWorkflowWithTesseraSize(stateWithSource, 10);

			expect(newState.currentStep).toBe(WorkflowStep.CHOOSE_TESSERAE);
		});
	});

	describe("updateWorkflowWithTesserae", () => {
		it("updates state with tesserae collection", () => {
			const tesserae: TesseraInfo[] = [
				{
					file: new File([], "test1.jpg"),
					fileName: "test1.jpg",
					isValid: true,
					error: null,
					isLowResolution: false,
					previewUrl: "data:image/jpeg;base64,test1",
				},
				{
					file: new File([], "test2.jpg"),
					fileName: "test2.jpg",
					isValid: false,
					error: "Unsupported format",
					isLowResolution: false,
					previewUrl: null,
				},
			];

			const newState = updateWorkflowWithTesserae(
				INITIAL_WORKFLOW_STATE,
				tesserae,
			);

			expect(newState.tesserae).toEqual(tesserae);
			expect(newState.validTesseraCount).toBe(1);
			expect(newState.rejectedTesseraCount).toBe(1);
			expect(newState.totalTesseraCount).toBe(2);
			expect(newState.currentStep).toBe(WorkflowStep.REVIEW_TESSERAE);
		});

		it("handles empty tesserae collection", () => {
			const newState = updateWorkflowWithTesserae(INITIAL_WORKFLOW_STATE, []);

			expect(newState.tesserae).toEqual([]);
			expect(newState.validTesseraCount).toBe(0);
			expect(newState.rejectedTesseraCount).toBe(0);
			expect(newState.totalTesseraCount).toBe(0);
			expect(newState.currentStep).toBe(WorkflowStep.REVIEW_TESSERAE);
		});
	});

	describe("updateWorkflowRemoveTessera", () => {
		it("removes a tessera at specified index", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
					{
						file: new File([], "test2.jpg"),
						fileName: "test2.jpg",
						isValid: false,
						error: "Unsupported format",
						isLowResolution: false,
						previewUrl: null,
					},
					{
						file: new File([], "test3.jpg"),
						fileName: "test3.jpg",
						isValid: true,
						error: null,
						isLowResolution: true,
						previewUrl: "data:image/jpeg;base64,test3",
					},
				],
				validTesseraCount: 2,
				rejectedTesseraCount: 1,
				totalTesseraCount: 3,
			};

			const newState = updateWorkflowRemoveTessera(initialState, 1);

			expect(newState.tesserae).toHaveLength(2);
			expect(newState.tesserae[0].fileName).toBe("test1.jpg");
			expect(newState.tesserae[1].fileName).toBe("test3.jpg");
			expect(newState.validTesseraCount).toBe(2);
			expect(newState.rejectedTesseraCount).toBe(0);
			expect(newState.totalTesseraCount).toBe(2);
		});

		it("returns unchanged state for invalid index", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				rejectedTesseraCount: 0,
				totalTesseraCount: 1,
			};

			const newState = updateWorkflowRemoveTessera(initialState, 5);

			expect(newState).toEqual(initialState);
		});

		it("returns unchanged state for negative index", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				rejectedTesseraCount: 0,
				totalTesseraCount: 1,
			};

			const newState = updateWorkflowRemoveTessera(initialState, -1);

			expect(newState).toEqual(initialState);
		});
	});

	describe("getVarietyRecommendation", () => {
		it("returns 10% of grid cells capped at 100", () => {
			// 10x10 grid = 100 cells, 10% = 10 (below cap)
			expect(getVarietyRecommendation(100)).toBe(10);

			// 50x50 grid = 2500 cells, 10% = 250 (above cap, should be 100)
			expect(getVarietyRecommendation(2500)).toBe(100);

			// 5x5 grid = 25 cells, 10% = 2.5 (should be 3 when rounded)
			expect(getVarietyRecommendation(25)).toBe(3);
		});
	});

	describe("checkLowVariety", () => {
		it("returns true when valid tesserae count is below 10% recommendation", () => {
			expect(checkLowVariety(5, 100)).toBe(true);
		});

		it("returns false when valid tesserae count meets or exceeds 10% recommendation", () => {
			expect(checkLowVariety(10, 100)).toBe(false);
			expect(checkLowVariety(15, 100)).toBe(false);
		});
	});

	describe("updateWorkflowWithSupplementedTesserae", () => {
		it("adds supplemented tesserae to the collection", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				rejectedTesseraCount: 0,
				totalTesseraCount: 1,
			};

			const supplementedTesserae: TesseraInfo[] = [
				{
					file: new File([], "generated1.jpg"),
					fileName: "generated1.jpg",
					isValid: true,
					error: null,
					isLowResolution: false,
					previewUrl: "data:image/jpeg;base64,generated1",
					isSupplemented: true,
				},
				{
					file: new File([], "generated2.jpg"),
					fileName: "generated2.jpg",
					isValid: true,
					error: null,
					isLowResolution: false,
					previewUrl: "data:image/jpeg;base64,generated2",
					isSupplemented: true,
				},
			];

			const newState = updateWorkflowWithSupplementedTesserae(
				initialState,
				supplementedTesserae,
			);

			expect(newState.tesserae).toHaveLength(3);
			expect(newState.validTesseraCount).toBe(3);
			expect(newState.rejectedTesseraCount).toBe(0);
			expect(newState.totalTesseraCount).toBe(3);
			expect(newState.hasAcceptedSupplementation).toBe(true);
			// Check that the supplemented tesserae are marked correctly
			expect(newState.tesserae[1].isSupplemented).toBe(true);
			expect(newState.tesserae[2].isSupplemented).toBe(true);
		});
	});

	describe("updateWorkflowToGeneratedMode", () => {
		it("switches to generated mode and sets a seed", () => {
			const stateWithSource = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
				currentStep: WorkflowStep.CHOOSE_TESSERAE,
			};

			const newState = updateWorkflowToGeneratedMode(stateWithSource);

			expect(newState.useGeneratedTesserae).toBe(true);
			expect(newState.seed).toBeDefined();
			expect(newState.currentStep).toBe(WorkflowStep.REVIEW_TESSERAE);
		});

		it("uses existing seed if available", () => {
			const stateWithSeed = {
				...INITIAL_WORKFLOW_STATE,
				seed: 12345,
			};

			const newState = updateWorkflowToGeneratedMode(stateWithSeed);

			expect(newState.seed).toBe(12345);
		});
	});

	describe("updateWorkflowToUploadMode", () => {
		it("switches to upload mode", () => {
			const generatedState = {
				...INITIAL_WORKFLOW_STATE,
				useGeneratedTesserae: true,
				currentStep: WorkflowStep.REVIEW_TESSERAE,
			};

			const newState = updateWorkflowToUploadMode(generatedState);

			expect(newState.useGeneratedTesserae).toBe(false);
			expect(newState.currentStep).toBe(WorkflowStep.CHOOSE_TESSERAE);
		});
	});

	describe("updateWorkflowWithSeed", () => {
		it("updates the seed and marks for regeneration", () => {
			const state = {
				...INITIAL_WORKFLOW_STATE,
				seed: 12345,
			};

			const newState = updateWorkflowWithSeed(state, 67890);

			expect(newState.seed).toBe(67890);
			expect(newState.needsRegeneration).toBe(true);
		});
	});

	describe("updateWorkflowWithNewSeed", () => {
		it("generates a new seed and marks for regeneration", () => {
			const state = {
				...INITIAL_WORKFLOW_STATE,
				seed: 12345,
			};

			const newState = updateWorkflowWithNewSeed(state);

			expect(newState.seed).toBeDefined();
			expect(newState.seed).not.toBe(12345);
			expect(newState.needsRegeneration).toBe(true);
		});
	});

	describe("updateWorkflowWithGeneratedTesseraCount", () => {
		it("updates the generated tessera count and marks for regeneration", () => {
			const state = {
				...INITIAL_WORKFLOW_STATE,
				generatedTesseraCount: 10,
			};

			const newState = updateWorkflowWithGeneratedTesseraCount(state, 25);

			expect(newState.generatedTesseraCount).toBe(25);
			expect(newState.needsRegeneration).toBe(true);
		});
	});

	describe("updateWorkflowWithGeneratedTesserae", () => {
		it("updates state with generated tesserae collection", () => {
			const tesserae: TesseraInfo[] = [
				{
					file: new File([], "test1.jpg"),
					fileName: "test1.jpg",
					isValid: true,
					error: null,
					isLowResolution: false,
					previewUrl: "data:image/jpeg;base64,test1",
				},
				{
					file: new File([], "test2.jpg"),
					fileName: "test2.jpg",
					isValid: false,
					error: "Unsupported format",
					isLowResolution: false,
					previewUrl: null,
				},
			];

			const newState = updateWorkflowWithGeneratedTesserae(
				INITIAL_WORKFLOW_STATE,
				tesserae,
			);

			expect(newState.tesserae).toEqual(tesserae);
			expect(newState.validTesseraCount).toBe(1);
			expect(newState.rejectedTesseraCount).toBe(1);
			expect(newState.totalTesseraCount).toBe(2);
			expect(newState.needsRegeneration).toBe(false);
		});
	});

	describe("updateWorkflowWithMosaicResult", () => {
		it("updates state with mosaic result and advances to export step", () => {
			const mosaicResult: MosaicResult = {
				dataUrl: "data:image/png;base64,test-mosaic",
				width: 100,
				height: 100,
			};

			const newState = updateWorkflowWithMosaicResult(
				INITIAL_WORKFLOW_STATE,
				mosaicResult,
			);

			expect(newState.mosaicResult).toEqual(mosaicResult);
			expect(newState.currentStep).toBe(WorkflowStep.EXPORT_MOSAIC);
			expect(newState.furthestCompletedStep).toBe(WorkflowStep.EXPORT_MOSAIC);
		});

		it("handles mosaic result with progress information", () => {
			const mosaicResult: MosaicResult = {
				dataUrl: "data:image/png;base64,test-mosaic",
				width: 100,
				height: 100,
				progress: {
					percent: 50,
					message: "Generating mosaic...",
				},
			};

			const newState = updateWorkflowWithMosaicResult(
				INITIAL_WORKFLOW_STATE,
				mosaicResult,
			);

			expect(newState.mosaicResult).toEqual(mosaicResult);
			expect(newState.currentStep).toBe(WorkflowStep.EXPORT_MOSAIC);
		});
	});

	describe("updateWorkflowExportSettings", () => {
		it("updates export alternative text", () => {
			const newState = updateWorkflowExportSettings(INITIAL_WORKFLOW_STATE, {
				exportAltText: "A beautiful mosaic of a landscape",
			});

			expect(newState.exportAltText).toBe("A beautiful mosaic of a landscape");
		});

		it("updates export format", () => {
			const newState = updateWorkflowExportSettings(INITIAL_WORKFLOW_STATE, {
				exportFormat: "jpeg",
			});

			expect(newState.exportFormat).toBe("jpeg");
		});

		it("updates export quality", () => {
			const newState = updateWorkflowExportSettings(INITIAL_WORKFLOW_STATE, {
				exportQuality: 0.8,
			});

			expect(newState.exportQuality).toBe(0.8);
		});

		it("updates export background color", () => {
			const newState = updateWorkflowExportSettings(INITIAL_WORKFLOW_STATE, {
				exportBackgroundColor: "#000000",
			});

			expect(newState.exportBackgroundColor).toBe("#000000");
		});

		it("updates multiple export settings at once", () => {
			const newState = updateWorkflowExportSettings(INITIAL_WORKFLOW_STATE, {
				exportFormat: "webp",
				exportQuality: 0.75,
				exportAltText: "A colorful mosaic",
			});

			expect(newState.exportFormat).toBe("webp");
			expect(newState.exportQuality).toBe(0.75);
			expect(newState.exportAltText).toBe("A colorful mosaic");
		});
	});

	describe("updateWorkflowOnSourceReplacement", () => {
		it("preserves tesserae but resets derived state on valid source replacement", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
				requestedTesseraSize: 10,
				adjustedTesseraSize: 10,
				isCoarseGrid: false,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				seed: 12345,
				mosaicResult: {
					dataUrl: "data:image/png;base64,test-mosaic",
					width: 100,
					height: 100,
				},
				currentStep: WorkflowStep.REVIEW_TESSERAE,
			};

			const newSourceImage = {
				width: 200,
				height: 200,
				orientation: 1,
			};

			const newState = updateWorkflowOnSourceReplacement(
				initialState,
				newSourceImage,
			);

			// Should preserve tesserae
			expect(newState.tesserae).toEqual(initialState.tesserae);
			expect(newState.validTesseraCount).toBe(1);

			// Should reset derived state
			expect(newState.requestedTesseraSize).toBeNull();
			expect(newState.adjustedTesseraSize).toBeNull();
			expect(newState.isCoarseGrid).toBe(false);
			expect(newState.seed).toBeNull();
			expect(newState.mosaicResult).toBeNull();
			expect(newState.needsRegeneration).toBe(false);

			// Should update source and step
			expect(newState.sourceImage).toEqual(newSourceImage);
			expect(newState.hasValidSourceDimensions).toBe(true);
			expect(newState.sourceImageError).toBeNull();
			expect(newState.currentStep).toBe(WorkflowStep.SET_TESSERA_SIZE);
		});

		it("handles invalid source replacement", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
				requestedTesseraSize: 10,
				adjustedTesseraSize: 10,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				seed: 12345,
				mosaicResult: {
					dataUrl: "data:image/png;base64,test-mosaic",
					width: 100,
					height: 100,
				},
				currentStep: WorkflowStep.REVIEW_TESSERAE,
			};

			const invalidSourceImage = {
				width: 11,
				height: 13,
				orientation: 1,
			};

			const newState = updateWorkflowOnSourceReplacement(
				initialState,
				invalidSourceImage,
			);

			// Should preserve tesserae
			expect(newState.tesserae).toEqual(initialState.tesserae);
			expect(newState.validTesseraCount).toBe(1);

			// Should reset derived state
			expect(newState.requestedTesseraSize).toBeNull();
			expect(newState.adjustedTesseraSize).toBeNull();
			expect(newState.isCoarseGrid).toBe(false);
			expect(newState.seed).toBeNull();
			expect(newState.mosaicResult).toBeNull();
			expect(newState.needsRegeneration).toBe(false);

			// Should update source with error
			expect(newState.sourceImage).toEqual(invalidSourceImage);
			expect(newState.hasValidSourceDimensions).toBe(false);
			expect(newState.sourceImageError).toContain("no valid tessera sizes");
			expect(newState.currentStep).toBe(WorkflowStep.CHOOSE_SOURCE_IMAGE);
		});
	});

	describe("updateWorkflowOnTesseraSizeChange", () => {
		it("preserves state and discards mosaic on tessera size change", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
				requestedTesseraSize: 10,
				adjustedTesseraSize: 10,
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				seed: 12345,
				mosaicResult: {
					dataUrl: "data:image/png;base64,test-mosaic",
					width: 100,
					height: 100,
				},
				useGeneratedTesserae: false,
				currentStep: WorkflowStep.REVIEW_TESSERAE,
			};

			const newState = updateWorkflowOnTesseraSizeChange(initialState, 15);

			// Should preserve tesserae and seed
			expect(newState.tesserae).toEqual(initialState.tesserae);
			expect(newState.validTesseraCount).toBe(1);
			expect(newState.seed).toBe(12345);

			// Should update size and discard mosaic
			expect(newState.requestedTesseraSize).toBe(15);
			expect(newState.adjustedTesseraSize).toBe(10); // 10 is closer to 15 than 20
			expect(newState.mosaicResult).toBeNull();
			expect(newState.needsRegeneration).toBe(false); // Not using generated mode
		});

		it("triggers regeneration when using generated tesserae", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				hasValidSourceDimensions: true,
				useGeneratedTesserae: true,
				seed: 12345,
			};

			const newState = updateWorkflowOnTesseraSizeChange(initialState, 15);

			// Should trigger regeneration for generated tesserae
			expect(newState.needsRegeneration).toBe(true);
		});

		it("does nothing when source image is not valid", () => {
			const newState = updateWorkflowOnTesseraSizeChange(
				INITIAL_WORKFLOW_STATE,
				10,
			);

			expect(newState).toEqual(INITIAL_WORKFLOW_STATE);
		});
	});

	describe("updateWorkflowOnCancellationOrFailure", () => {
		it("preserves valid state and discards incomplete output", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				sourceImage: {
					width: 100,
					height: 100,
					orientation: 1,
				},
				tesserae: [
					{
						file: new File([], "test1.jpg"),
						fileName: "test1.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: "data:image/jpeg;base64,test1",
					},
				],
				validTesseraCount: 1,
				mosaicResult: {
					dataUrl: "data:image/png;base64,test-mosaic",
					width: 100,
					height: 100,
				},
				needsRegeneration: true,
				currentStep: WorkflowStep.GENERATE_AND_PREVIEW,
			};

			const newState = updateWorkflowOnCancellationOrFailure(initialState);

			// Should preserve valid state
			expect(newState.sourceImage).toEqual(initialState.sourceImage);
			expect(newState.tesserae).toEqual(initialState.tesserae);
			expect(newState.validTesseraCount).toBe(1);

			// Should discard incomplete output
			expect(newState.mosaicResult).toBeNull();
			expect(newState.needsRegeneration).toBe(false);
		});
	});

	describe("updateWorkflowAdvanceFromReview", () => {
		it("advances from the review step to the generate-and-preview step", () => {
			const result = updateWorkflowAdvanceFromReview(INITIAL_WORKFLOW_STATE);
			expect(result.currentStep).toBe(WorkflowStep.GENERATE_AND_PREVIEW);
			expect(result.furthestCompletedStep).toBe(
				WorkflowStep.GENERATE_AND_PREVIEW,
			);
		});

		it("preserves all other state fields", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				currentStep: WorkflowStep.REVIEW_TESSERAE,
				sourceImage: { width: 100, height: 100, orientation: 1 },
				tesserae: [
					{
						file: new File([], "test.jpg"),
						fileName: "test.jpg",
						isValid: true,
						error: null,
						isLowResolution: false,
						previewUrl: null,
					},
				],
				validTesseraCount: 1,
			};

			const result = updateWorkflowAdvanceFromReview(initialState);

			expect(result.sourceImage).toEqual(initialState.sourceImage);
			expect(result.tesserae).toEqual(initialState.tesserae);
			expect(result.validTesseraCount).toBe(1);
			expect(result.mosaicResult).toBeNull();
		});
	});

	describe("updateWorkflowOnRegeneration", () => {
		it("replaces previous mosaic result", () => {
			const initialState = {
				...INITIAL_WORKFLOW_STATE,
				mosaicResult: {
					dataUrl: "data:image/png;base64,old-mosaic",
					width: 100,
					height: 100,
				},
			};

			const newMosaicResult: MosaicResult = {
				dataUrl: "data:image/png;base64,new-mosaic",
				width: 200,
				height: 200,
			};

			const newState = updateWorkflowOnRegeneration(
				initialState,
				newMosaicResult,
			);

			// Should replace mosaic result
			expect(newState.mosaicResult).toEqual(newMosaicResult);

			// Should preserve other state
			expect(newState.currentStep).toBe(initialState.currentStep);
		});
	});
});
