import { useRef } from "react";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { TesseraReview } from "./components/TesseraReview";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { ExportMosaic } from "./components/ExportMosaic";
import { WorkflowStep as WorkflowStepEnum } from "./engine/workflow-state";
import { useWorkflowReducer } from "./hooks/useWorkflowReducer";

const stages = [
	"Choose source image",
	"Build tesserae",
	"Generate and preview",
	"Export mosaic",
] as const;

/** Fallback tessera size when no adjusted size has been calculated yet. */
const DEFAULT_TESSERA_SIZE = 16;

/**
 * Root application component for the Mosaic Maker workflow.
 */
export function App() {
	const [workflowState, dispatch] = useWorkflowReducer();
	const sidebarToggleRef = useRef<HTMLInputElement>(null);

	const resolvedTesseraSize =
		workflowState.adjustedTesseraSize ?? DEFAULT_TESSERA_SIZE;

	function renderStepContent(stepIndex: number) {
		switch (stepIndex) {
			case WorkflowStepEnum.CHOOSE_SOURCE_IMAGE:
				return (
					<SourceImageSelection
						onSourceSelected={(sourceImage) =>
							dispatch({ type: "sourceSelected", sourceImage })
						}
						onSourceError={(errorMessage) =>
							dispatch({ type: "sourceError", errorMessage })
						}
						initialState={workflowState}
					/>
				);
			case WorkflowStepEnum.BUILD_TESSERAE:
				return (
					<div className="build-tesserae-container">
						<TesseraSizeSelection
							onSizeSelected={(size) =>
								dispatch({ type: "sizeSelected", size })
							}
							initialState={workflowState}
						/>
						{workflowState.useGeneratedTesserae ? (
							<GeneratedTesserae
								onTesseraeGenerated={(tesserae) =>
									dispatch({ type: "tesseraeGenerated", tesserae })
								}
								initialState={workflowState}
							/>
						) : (
							<TesseraUpload
								onTesseraeProcessed={(tesserae) =>
									dispatch({ type: "tesseraeProcessed", tesserae })
								}
								adjustedTesseraSize={resolvedTesseraSize}
							/>
						)}
						<TesseraReview
							tesserae={workflowState.tesserae}
							onRemoveTessera={(index) =>
								dispatch({ type: "removeTessera", index })
							}
							onContinue={() => dispatch({ type: "advanceFromReview" })}
							isLowVariety={workflowState.isLowVarietyCollection}
							varietyRecommendation={workflowState.varietyRecommendation}
							hasAcceptedSupplementation={
								workflowState.hasAcceptedSupplementation
							}
						/>
					</div>
				);
			case WorkflowStepEnum.GENERATE_AND_PREVIEW:
				return <GenerateAndPreview state={workflowState} dispatch={dispatch} />;
			case WorkflowStepEnum.EXPORT_MOSAIC:
				return <ExportMosaic state={workflowState} dispatch={dispatch} />;
			default:
				return <div>Step {stepIndex + 1} content coming soon</div>;
		}
	}

	const canGoForward =
		workflowState.currentStep < workflowState.furthestCompletedStep;

	return (
		<div className="layout-container">
			<header>
				<p className="eyebrow">Private, in-browser image making</p>
				<h1>Mosaic Maker</h1>
				<p>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<main className="workflow-container">
				<input
					ref={sidebarToggleRef}
					type="checkbox"
					id="workflow-sidebar-toggle"
					className="workflow-sidebar-toggle"
				/>
				<button
					className="workflow-sidebar-toggle-button"
					aria-label="Toggle workflow steps"
					type="button"
					onClick={() => {
						if (sidebarToggleRef.current) {
							sidebarToggleRef.current.click();
						}
					}}
				>
					☰
				</button>
				<div
					className="workflow-sidebar-scrim"
					aria-hidden="true"
					onClick={() => {
						if (sidebarToggleRef.current) {
							sidebarToggleRef.current.checked = false;
						}
					}}
				/>
				<aside className="workflow-sidebar" aria-label="Workflow steps">
					<button
						className="workflow-sidebar-close"
						aria-label="Close workflow steps"
						data-secondary
						type="button"
						onClick={() => {
							if (sidebarToggleRef.current) {
								sidebarToggleRef.current.click();
							}
						}}
					>
						✕
					</button>
					<ol>
						{stages.map((title, index) => {
							const isCurrent = workflowState.currentStep === index;
							const isCompleted = index < workflowState.currentStep;
							const isDisabled = index > workflowState.furthestCompletedStep;
							return (
								<li key={title}>
									<button
										type="button"
										className={`workflow-step-button ${isCurrent ? "current" : ""} ${isCompleted ? "completed" : ""}`}
										aria-current={isCurrent ? "step" : undefined}
										onClick={() => dispatch({ type: "goToStep", step: index })}
										disabled={isDisabled}
									>
										<span className="step-indicator">
											{isCompleted ? <span>✓</span> : <span>{index + 1}</span>}
										</span>
										<span className="step-title">{title}</span>
									</button>
								</li>
							);
						})}
					</ol>
				</aside>

				<div className="workflow-canvas">
					<div className="workflow-navigation">
						<button
							type="button"
							className="secondary"
							onClick={() =>
								dispatch({
									type: "goToStep",
									step: workflowState.currentStep - 1,
								})
							}
							disabled={workflowState.currentStep === 0}
						>
							← Back
						</button>
						<span className="workflow-step-counter">
							Step {workflowState.currentStep + 1} of {stages.length}
						</span>
						{canGoForward && (
							<button
								type="button"
								onClick={() =>
									dispatch({
										type: "goToStep",
										step: workflowState.currentStep + 1,
									})
								}
							>
								Next →
							</button>
						)}
					</div>

					<div className="workflow-content">
						{renderStepContent(workflowState.currentStep)}
					</div>
				</div>
			</main>
		</div>
	);
}
