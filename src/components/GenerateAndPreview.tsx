import { useState, useEffect, useRef } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import { generateMosaic } from "../engine/mosaic-engine";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";

interface GenerateAndPreviewProps {
	state: WorkflowState;
	dispatch: (action: WorkflowAction) => void;
}

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

	const abortControllerRef = useRef<AbortController | null>(null);
	const beforeUnloadRef = useRef<(event: BeforeUnloadEvent) => void>(
		(event) => {
			event.preventDefault();
			event.returnValue =
				"Generation is in progress. Are you sure you want to leave?";
		},
	);

	// Add beforeunload listener when generation is active
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

		abortControllerRef.current = new AbortController();

		try {
			// In a real implementation, we would pass the abort signal to generateMosaic
			const result = await generateMosaic(
				state.sourceImage,
				state.tesserae,
				state.adjustedTesseraSize,
			);

			// Set progress to simulate completion
			setProgress({ percent: 100, message: "Mosaic generated successfully" });

			// Create a preview URL (scaled down for display)
			setPreviewUrl(result.dataUrl);
			setPreviewDimensions({ width: result.width, height: result.height });

			// Update workflow with the result
			dispatch({ type: "mosaicGenerated", mosaicResult: result });
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			dispatch({ type: "generationCancelledOrFailed" });
		} finally {
			setIsGenerating(false);
			abortControllerRef.current = null;
		}
	};

	const handleCancel = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
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
						{isGenerating ? "Generating..." : "Generate Mosaic"}
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
				<div className="generation-progress">
					<h3>Generating Mosaic...</h3>
					{progress ? (
						<div className="progress-info">
							<div
								className="progress-bar"
								role="progressbar"
								aria-valuenow={progress.percent}
								aria-valuemin={0}
								aria-valuemax={100}
							>
								<div
									className="progress-fill"
									style={{ width: `${progress.percent}%` }}
								></div>
							</div>
							<p className="progress-text">{progress.message}</p>
						</div>
					) : (
						<div className="progress-indicator">
							<div className="spinner"></div>
							<p>Processing...</p>
						</div>
					)}
					<button
						type="button"
						onClick={handleCancel}
						className="cancel-button"
					>
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
							style={{
								maxWidth: "100%",
								maxHeight: "70vh",
								width: "auto",
								height: "auto",
							}}
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
