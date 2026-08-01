import { useState, useEffect, useRef } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import { generateMosaic } from "../engine/mosaic-engine";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";

/** Props for {@link GenerateAndPreview}. */
interface GenerateAndPreviewProps {
	/** Current workflow state, used for source image, tesserae, and tessera size. */
	state: WorkflowState;
	/** Dispatches workflow actions for mosaic generation results and cancellations. */
	dispatch: (action: WorkflowAction) => void;
}

function onBeforeUnload(event: BeforeUnloadEvent) {
	event.preventDefault();
	event.returnValue =
		"Generation is in progress. Are you sure you want to leave?";
}

/**
 * Mosaic generation step that orchestrates the async generation,
 * shows a progress indicator with cancel support, and displays the
 * generated mosaic preview.
 */
export function GenerateAndPreview({
	state,
	dispatch,
}: GenerateAndPreviewProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState<{
		percent: number;
		message: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewDimensions, setPreviewDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);

	const beforeUnloadRef = useRef(onBeforeUnload);

	useEffect(() => {
		if (isGenerating) {
			window.addEventListener("beforeunload", beforeUnloadRef.current);
		} else {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
		}

		return () => {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
		};
	}, [isGenerating]);

	const handleGenerate = async () => {
		if (!state.sourceImage || !state.adjustedTesseraSize) {
			setError("Missing source image or tessera size");
			return;
		}

		setIsGenerating(true);
		setError(null);
		setProgress(null);
		setPreviewUrl(null);
		setPreviewDimensions(null);

		try {
			const result = await generateMosaic(
				state.sourceImage,
				state.tesserae,
				state.adjustedTesseraSize,
			);

			setProgress({ percent: 100, message: "Mosaic generated successfully" });
			setPreviewUrl(result.dataUrl);
			setPreviewDimensions({ width: result.width, height: result.height });

			dispatch({ type: "mosaicGenerated", mosaicResult: result });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			dispatch({ type: "generationCancelledOrFailed" });
		} finally {
			setIsGenerating(false);
		}
	};

	const handleCancel = () => {
		setIsGenerating(false);
		setError(null);
		setProgress(null);
		dispatch({ type: "generationCancelledOrFailed" });
	};

	const canGenerate =
		state.sourceImage !== null &&
		state.adjustedTesseraSize !== null &&
		(state.tesserae.length > 0 || state.useGeneratedTesserae);

	return (
		<div className="generate-preview-step">
			{!isGenerating && !previewUrl && (
				<div className="generate-controls">
					<button
						type="button"
						onClick={handleGenerate}
						disabled={!canGenerate || isGenerating}
						aria-busy={isGenerating}
					>
						Generate Mosaic
					</button>

					{!canGenerate && (
						<p className="hint">
							Please ensure you have a source image, tessera size, and tesserae
							before generating.
						</p>
					)}

					{error && (
						<div className="error-message" role="alert">
							<strong>Error:</strong> {error}
						</div>
					)}
				</div>
			)}

			{isGenerating && (
				<div className="generation-progress" aria-busy="true">
					<h3>Generating Mosaic...</h3>
					{progress ? (
						<div className="progress-info">
							<progress
								value={progress.percent}
								max="100"
								aria-label="Generation progress"
							>
								{progress.percent}%
							</progress>
							<p className="progress-text">{progress.message}</p>
						</div>
					) : (
						<div className="progress-indicator">
							<div className="spinner" role="status" aria-label="Loading"></div>
							<p>Processing...</p>
						</div>
					)}
					<button type="button" onClick={handleCancel} className="outline">
						Cancel
					</button>
				</div>
			)}

			{previewUrl && previewDimensions && (
				<div className="preview-section">
					<h3>Preview</h3>
					<div className="preview-container">
						<img
							src={previewUrl}
							alt="Generated mosaic preview"
							className="mosaic-preview"
						/>
					</div>
					<p className="preview-info">
						Dimensions: {previewDimensions.width} × {previewDimensions.height}{" "}
						pixels
					</p>
				</div>
			)}
		</div>
	);
}
