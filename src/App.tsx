import { useState } from "react";
import { WorkflowStep } from "./components/WorkflowStep";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { TesseraReview } from "./components/TesseraReview";
import {
	INITIAL_WORKFLOW_STATE,
	WorkflowStep as WorkflowStepEnum,
	type WorkflowState,
} from "./engine/workflow-state";
import type { SourceImageInfo } from "./engine/image-processing";
import type { TesseraInfo } from "./engine/workflow-state";

const stages = [
	["Choose source image", "Select a JPEG, PNG, or WebP image."],
	["Set tessera size", "Choose the square size of each tessera."],
	["Choose tesserae", "Upload tesserae or create generated tesserae."],
	["Review tesserae", "Check the collection before building the mosaic."],
	["Generate and preview", "Build the mosaic and inspect the result."],
	["Export mosaic", "Download the full-resolution mosaic."],
] as const;

export function App() {
	const [workflowState, setWorkflowState] = useState<WorkflowState>(
		INITIAL_WORKFLOW_STATE,
	);

	const handleSourceSelected = (sourceImage: SourceImageInfo) => {
		// In a real implementation, we would use the workflow state update functions
		setWorkflowState((prev) => ({
			...prev,
			sourceImage,
			hasValidSourceDimensions: true,
			sourceImageError: null,
			currentStep: WorkflowStepEnum.SET_TESSERA_SIZE,
		}));
	};

	const handleSourceError = (errorMessage: string) => {
		setWorkflowState((prev) => ({
			...prev,
			sourceImage: null,
			hasValidSourceDimensions: false,
			sourceImageError: errorMessage,
		}));
	};

	const handleSizeSelected = (size: number) => {
		setWorkflowState((prev) => ({
			...prev,
			requestedTesseraSize: size,
			adjustedTesseraSize: size, // Simplified for now
			currentStep: WorkflowStepEnum.CHOOSE_TESSERAE,
		}));
	};

	const handleTesseraeProcessed = (tesserae: TesseraInfo[]) => {
		setWorkflowState((prev) => ({
			...prev,
			tesserae,
			validTesseraCount: tesserae.filter((t) => t.isValid).length,
			rejectedTesseraCount:
				tesserae.length - tesserae.filter((t) => t.isValid).length,
			totalTesseraCount: tesserae.length,
			currentStep: WorkflowStepEnum.REVIEW_TESSERAE,
		}));
	};

	const handleTesseraeGenerated = (tesserae: TesseraInfo[]) => {
		handleTesseraeProcessed(tesserae);
	};

	const handleRemoveTessera = (index: number) => {
		setWorkflowState((prev) => {
			const newTesserae = [...prev.tesserae];
			newTesserae.splice(index, 1);
			return {
				...prev,
				tesserae: newTesserae,
				validTesseraCount: newTesserae.filter((t) => t.isValid).length,
				rejectedTesseraCount:
					newTesserae.length - newTesserae.filter((t) => t.isValid).length,
				totalTesseraCount: newTesserae.length,
			};
		});
	};

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
						{stages.map(([title, description], index) => (
							<li
								aria-current={
									workflowState.currentStep === index ? "step" : undefined
								}
								key={title}
								className={workflowState.currentStep === index ? "current" : ""}
							>
								<WorkflowStep
									title={title}
									description={description}
									isCurrent={workflowState.currentStep === index}
									stepNumber={index + 1}
								>
									{renderStepContent(index)}
								</WorkflowStep>
							</li>
						))}
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
				return workflowState.useGeneratedTesserae ? (
					<GeneratedTesserae
						onTesseraeGenerated={handleTesseraeGenerated}
						initialState={workflowState}
						adjustedTesseraSize={workflowState.adjustedTesseraSize || 16}
					/>
				) : (
					<TesseraUpload
						onTesseraeProcessed={handleTesseraeProcessed}
						adjustedTesseraSize={workflowState.adjustedTesseraSize || 16}
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
				return (
					<div>
						Step {stepIndex + 1} content will be implemented in a future task
					</div>
				);
		}
	}
}
