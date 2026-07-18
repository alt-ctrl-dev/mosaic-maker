import { describe, expect, it } from "vitest";
import {
	INITIAL_WORKFLOW_STATE,
	updateWorkflowWithSourceImage,
	updateWorkflowWithSourceImageError,
	updateWorkflowWithTesseraSize,
	updateWorkflowWithTesserae,
	updateWorkflowRemoveTessera,
	updateWorkflowWithMosaicResult,
	updateWorkflowExportSettings,
	WorkflowStep,
	type TesseraInfo,
	type MosaicResult,
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
});
