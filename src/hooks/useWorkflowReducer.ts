import { type Dispatch, useReducer } from "react";
import type { SourceImageInfo } from "../engine/image-processing";
import type { MosaicResult } from "../engine/mosaic-engine";
import {
	INITIAL_WORKFLOW_STATE,
	WorkflowStep,
	type ExportSettings,
	type TesseraInfo,
	type WorkflowState,
	updateWorkflowExportSettings,
	updateWorkflowOnCancellationOrFailure,
	updateWorkflowRemoveTessera,
	updateWorkflowWithGeneratedTesserae,
	updateWorkflowWithMosaicResult,
	updateWorkflowWithSourceImage,
	updateWorkflowWithSourceImageError,
	updateWorkflowWithTesseraSize,
	updateWorkflowWithTesserae,
} from "../engine/workflow-state";

/**
 * Actions that drive workflow state transitions. Each action mirrors a user
 * interaction from a workflow step and carries the payload needed to apply the
 * corresponding {@link WorkflowState} transition.
 */
export type WorkflowAction =
	| { type: "sourceSelected"; sourceImage: SourceImageInfo }
	| { type: "sourceError"; errorMessage: string }
	| { type: "sizeSelected"; size: number }
	| { type: "tesseraeProcessed"; tesserae: TesseraInfo[] }
	| { type: "tesseraeGenerated"; tesserae: TesseraInfo[] }
	| { type: "removeTessera"; index: number }
	| { type: "mosaicGenerated"; mosaicResult: MosaicResult }
	| { type: "generationCancelledOrFailed" }
	| { type: "exportSettingsChanged"; settings: Partial<ExportSettings> }
	| { type: "goToStep"; step: number }
	| { type: "advanceFromReview" };

/**
 * Reduce the workflow state for a dispatched {@link WorkflowAction}.
 * Delegates each action to the matching pure `updateWorkflow*` transition so
 * the reducer stays a thin routing layer over the workflow-state module.
 *
 * @param state - The current workflow state
 * @param action - The action describing the workflow transition to apply
 * @returns The next workflow state
 */
export function workflowReducer(
	state: WorkflowState,
	action: WorkflowAction,
): WorkflowState {
	switch (action.type) {
		case "sourceSelected":
			return updateWorkflowWithSourceImage(state, action.sourceImage);
		case "sourceError":
			return updateWorkflowWithSourceImageError(state, action.errorMessage);
		case "sizeSelected":
			return updateWorkflowWithTesseraSize(state, action.size);
		case "tesseraeProcessed":
			return updateWorkflowWithTesserae(state, action.tesserae);
		case "tesseraeGenerated":
			return updateWorkflowWithGeneratedTesserae(state, action.tesserae);
		case "removeTessera":
			return updateWorkflowRemoveTessera(state, action.index);
		case "mosaicGenerated":
			return updateWorkflowWithMosaicResult(state, action.mosaicResult);
		case "generationCancelledOrFailed":
			return updateWorkflowOnCancellationOrFailure(state);
		case "exportSettingsChanged":
			return updateWorkflowExportSettings(state, action.settings);
		case "goToStep": {
			const stepCount = Object.keys(WorkflowStep).length / 2;
			const clamped = Math.max(0, Math.min(action.step, stepCount - 1));
			return { ...state, currentStep: clamped };
		}
		case "advanceFromReview":
			return { ...state, currentStep: WorkflowStep.GENERATE_AND_PREVIEW };
	}
}

/**
 * React hook that manages {@link WorkflowState} with {@link workflowReducer}.
 *
 * @param initialState - The starting workflow state, defaulting to
 *   {@link INITIAL_WORKFLOW_STATE}
 * @returns A tuple of the current workflow state and a dispatch function for
 *   {@link WorkflowAction} values
 */
export function useWorkflowReducer(
	initialState: WorkflowState = INITIAL_WORKFLOW_STATE,
): [WorkflowState, Dispatch<WorkflowAction>] {
	return useReducer(workflowReducer, initialState);
}
