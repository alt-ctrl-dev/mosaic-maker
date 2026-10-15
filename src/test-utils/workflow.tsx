import { type RenderResult, render } from "@testing-library/react";
import { type createStore, Provider } from "jotai";
import type { ReactElement } from "react";
import { createWorkflowStore } from "../atoms/workflow-atoms";
import type { WorkflowState } from "../engine/workflow-state";

/**
 * Render a component inside a jotai Provider whose store is seeded from a
 * (partial) workflow state snapshot. Returns the store so tests can assert
 * on atom values after interactions.
 */
export function renderWithWorkflow(
	ui: ReactElement,
	state: Partial<WorkflowState> = {},
): RenderResult & { store: ReturnType<typeof createStore> } {
	const store = createWorkflowStore(state);
	const result = render(<Provider store={store}>{ui}</Provider>);
	return { ...result, store };
}
