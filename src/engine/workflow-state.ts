import type { SourceImageInfo } from "./image-processing";
import {
  calculateAdjustedTesseraSize,
  calculateGridCellCount,
  isCoarseGrid,
  hasValidTesseraSizes,
} from "./tessera-sizing";

/**
 * Represents the current state of the mosaic creation workflow.
 */
export interface WorkflowState {
  /** The current step in the workflow */
  currentStep: number;
  /** Information about the selected source image, if any */
  sourceImage: SourceImageInfo | null;
  /** The tessera size requested by the user */
  requestedTesseraSize: number | null;
  /** The adjusted tessera size after validation */
  adjustedTesseraSize: number | null;
  /** Whether the adjusted tessera size results in a coarse grid */
  isCoarseGrid: boolean;
  /** Whether the source image has valid dimensions for tessera sizing */
  hasValidSourceDimensions: boolean;
  /** Error message if source image processing failed */
  sourceImageError: string | null;
}

/**
 * Initial workflow state.
 */
export const INITIAL_WORKFLOW_STATE: WorkflowState = {
  currentStep: 0,
  sourceImage: null,
  requestedTesseraSize: null,
  adjustedTesseraSize: null,
  isCoarseGrid: false,
  hasValidSourceDimensions: false,
  sourceImageError: null,
};

/**
 * Workflow steps.
 */
export enum WorkflowStep {
  CHOOSE_SOURCE_IMAGE = 0,
  SET_TESSERA_SIZE = 1,
  CHOOSE_TESSERAE = 2,
  REVIEW_TESSERAE = 3,
  GENERATE_AND_PREVIEW = 4,
  EXPORT_MOSAIC = 5,
}

/**
 * Update workflow state with a new source image.
 *
 * @param state - Current workflow state
 * @param sourceImage - Information about the source image
 * @returns Updated workflow state
 */
export function updateWorkflowWithSourceImage(
  state: WorkflowState,
  sourceImage: SourceImageInfo
): WorkflowState {
  const hasValidDimensions = hasValidTesseraSizes(sourceImage.width, sourceImage.height);
  
  if (!hasValidDimensions) {
    return {
      ...state,
      sourceImage,
      hasValidSourceDimensions: false,
      sourceImageError: "The selected image has no valid tessera sizes (no common divisors above 8 pixels). Please select a different image.",
      currentStep: WorkflowStep.CHOOSE_SOURCE_IMAGE,
    };
  }
  
  return {
    ...state,
    sourceImage,
    hasValidSourceDimensions: true,
    sourceImageError: null,
    currentStep: WorkflowStep.SET_TESSERA_SIZE,
  };
}

/**
 * Update workflow state when source image processing fails.
 *
 * @param state - Current workflow state
 * @param errorMessage - Error message explaining the failure
 * @returns Updated workflow state
 */
export function updateWorkflowWithSourceImageError(
  state: WorkflowState,
  errorMessage: string
): WorkflowState {
  return {
    ...state,
    sourceImage: null,
    hasValidSourceDimensions: false,
    sourceImageError: errorMessage,
  };
}

/**
 * Update workflow state with a tessera size request.
 *
 * @param state - Current workflow state
 * @param requestedSize - The tessera size requested by the user
 * @returns Updated workflow state with adjusted size and validation info
 */
export function updateWorkflowWithTesseraSize(
  state: WorkflowState,
  requestedSize: number
): WorkflowState {
  if (!state.sourceImage || !state.hasValidSourceDimensions) {
    return state;
  }

  const adjustedSize = calculateAdjustedTesseraSize(
    requestedSize,
    state.sourceImage.width,
    state.sourceImage.height
  );

  if (adjustedSize === null) {
    // This should not happen if hasValidSourceDimensions is true
    return {
      ...state,
      requestedTesseraSize: requestedSize,
      adjustedTesseraSize: null,
      isCoarseGrid: false,
    };
  }

  const cellCount = calculateGridCellCount(
    adjustedSize,
    state.sourceImage.width,
    state.sourceImage.height
  );

  return {
    ...state,
    requestedTesseraSize: requestedSize,
    adjustedTesseraSize: adjustedSize,
    isCoarseGrid: isCoarseGrid(cellCount),
  };
}
