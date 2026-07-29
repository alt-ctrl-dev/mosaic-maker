import { WorkflowStep } from "./components/WorkflowStep";
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
	["Choose source image", "Select a JPEG, PNG, or WebP image."],
	["Set tessera size", "Choose the square size of each tessera."],
	["Choose tesserae", "Upload tesserae or create generated tesserae."],
	["Review tesserae", "Check the collection before building the mosaic."],
	["Generate and preview", "Build the mosaic and inspect the result."],
	["Export mosaic", "Download the full-resolution mosaic."],
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
			case WorkflowStepEnum.SET_TESSERA_SIZE:
				return (
					<TesseraSizeSelection
						onSizeSelected={(size) => dispatch({ type: "sizeSelected", size })}
						initialState={workflowState}
					/>
				);
			case WorkflowStepEnum.CHOOSE_TESSERAE:
				if (workflowState.useGeneratedTesserae) {
					return (
						<GeneratedTesserae
							onTesseraeGenerated={(tesserae) =>
								dispatch({ type: "tesseraeGenerated", tesserae })
							}
							initialState={workflowState}
						/>
					);
				}
				return (
					<TesseraUpload
						onTesseraeProcessed={(tesserae) =>
							dispatch({ type: "tesseraeProcessed", tesserae })
						}
						adjustedTesseraSize={resolvedTesseraSize}
					/>
				);
			case WorkflowStepEnum.REVIEW_TESSERAE:
				return (
					<TesseraReview
						tesserae={workflowState.tesserae}
						onRemoveTessera={(index) =>
							dispatch({ type: "removeTessera", index })
						}
						isLowVariety={workflowState.isLowVarietyCollection}
						varietyRecommendation={workflowState.varietyRecommendation}
						hasAcceptedSupplementation={
							workflowState.hasAcceptedSupplementation
						}
					/>
				);
			case WorkflowStepEnum.GENERATE_AND_PREVIEW:
				return <GenerateAndPreview state={workflowState} dispatch={dispatch} />;
			case WorkflowStepEnum.EXPORT_MOSAIC:
				return <ExportMosaic state={workflowState} dispatch={dispatch} />;
			default:
				return <div>Step {stepIndex + 1} content coming soon</div>;
		}
	}

	return (
		<>
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<header className="container">
				<p className="eyebrow">Private, in-browser image making</p>
				<h1>Mosaic Maker</h1>
				<p>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<main id="main-content" className="container">
				<nav aria-label="Mosaic workflow">
					<ol className="workflow">
						{stages.map(([title, description], index) => {
							const isCurrent = workflowState.currentStep === index;
							return (
								<li aria-current={isCurrent ? "step" : undefined} key={title}>
									<WorkflowStep
										title={title}
										description={description}
										stepNumber={index + 1}
									>
										{renderStepContent(index)}
									</WorkflowStep>
								</li>
							);
						})}
					</ol>
				</nav>
			</main>
		</>
	);
}
