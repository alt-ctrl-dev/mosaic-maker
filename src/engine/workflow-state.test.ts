import { describe, expect, it } from "vitest";
import {
  INITIAL_WORKFLOW_STATE,
  updateWorkflowWithSourceImage,
  updateWorkflowWithSourceImageError,
  updateWorkflowWithTesseraSize,
  WorkflowStep,
} from "./workflow-state";

describe("workflow-state", () => {
  describe("INITIAL_WORKFLOW_STATE", () => {
    it("starts at the choose source image step", () => {
      expect(INITIAL_WORKFLOW_STATE.currentStep).toBe(
        WorkflowStep.CHOOSE_SOURCE_IMAGE
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
        sourceImage
      );

      expect(newState.sourceImage).toEqual(sourceImage);
      expect(newState.hasValidSourceDimensions).toBe(true);
      expect(newState.sourceImageError).toBeNull();
      expect(newState.currentStep).toBe(WorkflowStep.SET_TESSERA_SIZE);
    });
  });

  describe("updateWorkflowWithSourceImageError", () => {
    it("updates state with source image error", () => {
      const errorMessage = "Unsupported file type";
      const newState = updateWorkflowWithSourceImageError(
        INITIAL_WORKFLOW_STATE,
        errorMessage
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
        10
      );

      expect(newState.requestedTesseraSize).toBeNull();
      expect(newState.adjustedTesseraSize).toBeNull();
    });
  });
});
