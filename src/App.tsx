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
import { generateSupplementedTesserae } from "./engine/workflow-state";
import { resizeTesserae } from "./engine/tessera-processing";

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

	function toggleSidebar() {
		sidebarToggleRef.current?.click();
	}

	const resolvedTesseraSize =
		workflowState.adjustedTesseraSize ?? DEFAULT_TESSERA_SIZE;

	const handleAcceptSupplementation =
		workflowState.isLowVarietyCollection &&
		!workflowState.hasAcceptedSupplementation
			? async () => {
					const supplementedTesserae =
						await generateSupplementedTesserae(workflowState);
					dispatch({
						type: "tesseraeSupplemented",
						tesserae: supplementedTesserae,
					});
				}
			: undefined;

	async function handleSizeSelected(size: number) {
		dispatch({ type: "sizeSelected", size });

		if (workflowState.tesserae.length === 0) return;

		try {
			const resizedTesserae = await resizeTesserae(
				workflowState.tesserae,
				size,
			);
			dispatch({
				type: "tesseraeResized",
				tesserae: resizedTesserae,
			});
		} catch (error) {
			console.error("Error resizing tesserae:", error);
		}
	}

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
							onSizeSelected={handleSizeSelected}
							initialState={workflowState}
						/>
						<div className="tessera-inputs">
							<TesseraUpload
								onTesseraeProcessed={(tesserae) =>
									dispatch({ type: "tesseraeProcessed", tesserae })
								}
								adjustedTesseraSize={resolvedTesseraSize}
							/>
							<GeneratedTesserae
								onTesseraeGenerated={(tesserae) =>
									dispatch({ type: "tesseraeGenerated", tesserae })
								}
								initialState={workflowState}
							/>
						</div>
						{workflowState.tesserae.length > 0 && (
							<button
								type="button"
								onClick={() => dispatch({ type: "clearAllTesserae" })}
								className="secondary"
								style={{ marginBottom: "1rem" }}
							>
								Clear All Tesserae
							</button>
						)}
						<TesseraReview
							tesserae={workflowState.tesserae}
							onRemoveTessera={(index) =>
								dispatch({ type: "removeTessera", index })
							}
							onAcceptSupplementation={handleAcceptSupplementation}
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
					onClick={toggleSidebar}
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
						onClick={toggleSidebar}
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
