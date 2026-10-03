import { AppFooter } from "./components/AppFooter";
import { Dialog } from "./components/Dialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ExportMosaic } from "./components/ExportMosaic";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { LegoColorPicker } from "./components/LegoColorPicker";
import { ModeSelection } from "./components/ModeSelection";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraReview } from "./components/TesseraReview";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { resizeTesserae } from "./engine/tessera-processing";
import {
	generateSupplementedTesserae,
	WorkflowStep as WorkflowStepEnum,
} from "./engine/workflow-state";
import { useWorkflowReducer } from "./hooks/useWorkflowReducer";
import { trackError } from "./telemetry";

const stages = [
	"Choose mode",
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
			trackError("tesserae_resize", error, {
				tesseraCount: workflowState.tesserae.length,
				targetSize: size,
			});
		}
	}

	function renderStepContent(stepIndex: number) {
		switch (stepIndex) {
			case WorkflowStepEnum.CHOOSE_MODE:
				return (
					<ModeSelection
						mode={workflowState.mode}
						onModeSelected={(mode) => dispatch({ type: "modeSelected", mode })}
						onContinue={() =>
							dispatch({
								type: "goToStep",
								step: WorkflowStepEnum.CHOOSE_SOURCE_IMAGE,
							})
						}
					/>
				);
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
			case WorkflowStepEnum.BUILD_TESSERAE: {
				const isPhotomosaic = workflowState.mode === "photomosaic";
				const isLego = workflowState.mode === "lego";
				const hasPhotomosaicTesserae =
					isPhotomosaic && workflowState.tesserae.length > 0;
				const hasLegoColors = isLego && workflowState.tesserae.length >= 2;
				const canReview = hasPhotomosaicTesserae || hasLegoColors;

				return (
					<div className="build-tesserae-container">
						<TesseraSizeSelection
							onSizeSelected={handleSizeSelected}
							initialState={workflowState}
						/>
						{isPhotomosaic && (
							<>
								<div className="tessera-inputs">
									<TesseraUpload
										onTesseraeProcessed={(tesserae) =>
											dispatch({ type: "tesseraeProcessed", tesserae })
										}
										adjustedTesseraSize={resolvedTesseraSize}
									/>
									<p>OR</p>
									<GeneratedTesserae
										onTesseraeGenerated={(tesserae) =>
											dispatch({ type: "tesseraeGenerated", tesserae })
										}
										initialState={workflowState}
									/>
								</div>
								{hasPhotomosaicTesserae && (
									<button
										type="button"
										onClick={() => dispatch({ type: "clearAllTesserae" })}
										className="secondary"
										style={{ marginBottom: "1rem" }}
									>
										Clear all tiles
									</button>
								)}
							</>
						)}
						{isLego && (
							<LegoColorPicker
								onTesseraeSelected={(tesserae) =>
									dispatch({ type: "tesseraeProcessed", tesserae })
								}
								initialColors={workflowState.tesserae
									.map((tessera) => tessera.color)
									.filter((color): color is string => color !== undefined)}
							/>
						)}
						{canReview && (
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
						)}
					</div>
				);
			}
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

	const showBackButton = workflowState.currentStep > 0;

	const showTopNextButton =
		canGoForward && workflowState.currentStep > WorkflowStepEnum.BUILD_TESSERAE;

	return (
		<div className="layout-container">
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<header>
				<p className="eyebrow">
					Private, in-browser image making • Works offline once loaded
				</p>
				<h1>Mosaic Maker</h1>
				<p>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<ErrorBoundary>
				<main id="main-content" className="workflow-container">
					<Dialog
						dialogId="mobile-workflow-menu"
						ariaLabel="Toggle workflow steps"
					>
						<ol className="workflow-steps">
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
											onClick={() =>
												dispatch({ type: "goToStep", step: index })
											}
											disabled={isDisabled}
											commandfor="mobile-workflow-menu"
											command="close"
										>
											<span className="step-indicator">
												{isCompleted ? (
													<span>✓</span>
												) : (
													<span>{index + 1}</span>
												)}
											</span>
											<span className="step-title">{title}</span>
										</button>
									</li>
								);
							})}
						</ol>
					</Dialog>

					<aside className="workflow-sidebar" aria-label="Workflow steps">
						<ol className="workflow-steps">
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
											onClick={() =>
												dispatch({ type: "goToStep", step: index })
											}
											disabled={isDisabled}
										>
											<span className="step-indicator">
												{isCompleted ? (
													<span>✓</span>
												) : (
													<span>{index + 1}</span>
												)}
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
							{showBackButton && (
								<button
									type="button"
									className="secondary"
									onClick={() =>
										dispatch({
											type: "goToStep",
											step: workflowState.currentStep - 1,
										})
									}
								>
									← Back
								</button>
							)}
							<span className="workflow-step-counter">
								Step {workflowState.currentStep + 1} of {stages.length}
							</span>
							{showTopNextButton && (
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
			</ErrorBoundary>
			<AppFooter />
		</div>
	);
}
