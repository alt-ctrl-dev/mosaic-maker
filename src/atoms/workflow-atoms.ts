import { atom } from "jotai";
import { INITIAL_WORKFLOW_STATE } from "../engine/workflow-state";

/** Each App Provider owns an independent copy of the workflow state. */
export const workflowStateAtom = atom(INITIAL_WORKFLOW_STATE);
