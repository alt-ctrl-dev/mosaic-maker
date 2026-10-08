import { atom } from "jotai";
import { INITIAL_WORKFLOW_STATE } from "../engine/workflow-state";

export const workflowStateAtom = atom(INITIAL_WORKFLOW_STATE);
