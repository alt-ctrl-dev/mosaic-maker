import { useCallback, useState } from "react";
import { WorkflowStep } from "./components/WorkflowStep";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { TesseraReview } from "./components/TesseraReview";
import {
	INITIAL_WORKFLOW_STATE,
	WorkflowStep as WorkflowStepEnum,
	type TesseraInfo,
	type WorkflowState,
	updateWorkflowRemoveTessera,
	updateWorkflowWithGeneratedTesserae,
	updateWorkflowWithSourceImage,
	updateWorkflowWithSourceImageError,
	updateWorkflowWithTesseraSize,
	updateWorkflowWithTesserae,
} from "./engine/workflow-state";
import type { SourceImageInfo } from "./engine/image-processing";

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
	const [workflowState, setWorkflowState] = useState<WorkflowState>(
		INITIAL_WORKFLOW_STATE,
	);

	const handleSourceSelected = useCallback((sourceImage: SourceImageInfo) => {
		setWorkflowState((prev) =>
			updateWorkflowWithSourceImage(prev, sourceImage),
		);
	}, []);

	const handleSourceError = useCallback((errorMessage: string) => {
		setWorkflowState((prev) =>
			updateWorkflowWithSourceImageError(prev, errorMessage),
		);
	}, []);

	const handleSizeSelected = useCallback((size: number) => {
		setWorkflowState((prev) => updateWorkflowWithTesseraSize(prev, size));
	}, []);

	const handleTesseraeProcessed = useCallback((tesserae: TesseraInfo[]) => {
		setWorkflowState((prev) => updateWorkflowWithTesserae(prev, tesserae));
	}, []);

	const handleTesseraeGenerated = useCallback((tesserae: TesseraInfo[]) => {
		setWorkflowState((prev) =>
			updateWorkflowWithGeneratedTesserae(prev, tesserae),
		);
	}, []);

	const handleRemoveTessera = useCallback((index: number) => {
		setWorkflowState((prev) => updateWorkflowRemoveTessera(prev, index));
	}, []);

	const resolvedTesseraSize =
		workflowState.adjustedTesseraSize ?? DEFAULT_TESSERA_SIZE;

	return (
		<>
			<header className="container">
				<p className="eyebrow">Private, in-browser image making</p>
				<h1>Mosaic Maker</h1>
				<p>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<main className="container">
				<nav aria-label="Mosaic workflow">
					<ol className="workflow">
						{stages.map(([title, description], index) => {
							const isCurrent = workflowState.currentStep === index;
							return (
								<li
									aria-current={isCurrent ? "step" : undefined}
									key={title}
									className={isCurrent ? "current" : ""}
								>
									<WorkflowStep
										title={title}
										description={description}
										isCurrent={isCurrent}
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

	function renderStepContent(stepIndex: number) {
		switch (stepIndex) {
			case WorkflowStepEnum.CHOOSE_SOURCE_IMAGE:
				return (
					<SourceImageSelection
						onSourceSelected={handleSourceSelected}
						onSourceError={handleSourceError}
						initialState={workflowState}
					/>
				);
			case WorkflowStepEnum.SET_TESSERA_SIZE:
				return (
					<TesseraSizeSelection
						onSizeSelected={handleSizeSelected}
						initialState={workflowState}
					/>
				);
			case WorkflowStepEnum.CHOOSE_TESSERAE:
				if (workflowState.useGeneratedTesserae) {
					return (
						<GeneratedTesserae
							onTesseraeGenerated={handleTesseraeGenerated}
							initialState={workflowState}
						/>
					);
				}
				return (
					<TesseraUpload
						onTesseraeProcessed={handleTesseraeProcessed}
						adjustedTesseraSize={resolvedTesseraSize}
					/>
				);
			case WorkflowStepEnum.REVIEW_TESSERAE:
				return (
					<TesseraReview
						tesserae={workflowState.tesserae}
						onRemoveTessera={handleRemoveTessera}
						isLowVariety={workflowState.isLowVarietyCollection}
						varietyRecommendation={workflowState.varietyRecommendation}
						hasAcceptedSupplementation={
							workflowState.hasAcceptedSupplementation
						}
					/>
				);
			default:
				return <div>Step {stepIndex + 1} content coming soon</div>;
		}
	}
}
