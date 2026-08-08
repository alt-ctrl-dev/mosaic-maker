import { useState, useEffect, useRef } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import { generateMosaic, type ProgressCallback } from "../engine/mosaic-engine";
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
	const workerRef = useRef<Worker | null>(null);

	useEffect(() => {
		if (isGenerating) {
			window.addEventListener("beforeunload", beforeUnloadRef.current);
		} else {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
		}

		return () => {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
			// Clean up worker on unmount
			if (workerRef.current) {
				workerRef.current.terminate();
			}
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

		// Try to use Web Worker if available
		if (typeof Worker !== "undefined") {
			try {
				// Create Web Worker
				const workerUrl = new URL(
					"../engine/mosaic-worker.ts",
					import.meta.url,
				);
				workerRef.current = new Worker(workerUrl, { type: "module" });

				// Handle messages from worker
				workerRef.current.onmessage = (event) => {
					const { type, ...data } = event.data;

					switch (type) {
						case "progress":
							setProgress({ percent: data.percent, message: data.message });
							break;
						case "result":
							if (data.dataUrl) {
								setPreviewUrl(data.dataUrl);
								setPreviewDimensions({
									width: data.width,
									height: data.height,
								});
								dispatch({
									type: "mosaicGenerated",
									mosaicResult: {
										dataUrl: data.dataUrl,
										width: data.width,
										height: data.height,
									},
								});
							} else {
								// Generation was cancelled
								dispatch({ type: "generationCancelledOrFailed" });
							}
							setIsGenerating(false);
							if (workerRef.current) {
								workerRef.current.terminate();
								workerRef.current = null;
							}
							break;
						case "error":
							setError(data.message);
							dispatch({ type: "generationCancelledOrFailed" });
							setIsGenerating(false);
							if (workerRef.current) {
								workerRef.current.terminate();
								workerRef.current = null;
							}
							break;
					}
				};

				// Send generation request to worker
				workerRef.current.postMessage({
					type: "generate",
					sourceImage: state.sourceImage,
					tesserae: state.tesserae,
					tesseraSize: state.adjustedTesseraSize,
				});
			} catch (err) {
				// Fallback to main thread generation if worker fails
				console.warn(
					"Web Worker not supported or failed, falling back to main thread",
					err,
				);
				await generateOnMainThread();
			}
		} else {
			// Fallback to main thread if Web Workers not supported
			await generateOnMainThread();
		}
	};

	const generateOnMainThread = async () => {
		const progressCallback: ProgressCallback = (percent, message) => {
			setProgress({ percent, message });
		};

		if (!state.sourceImage || !state.adjustedTesseraSize) {
			setError("Missing source image or tessera size");
			setIsGenerating(false);
			return;
		}

		try {
			const result = await generateMosaic(
				state.sourceImage,
				state.tesserae,
				state.adjustedTesseraSize,
				undefined, // canvasCreator
				undefined, // imageLoader
				progressCallback,
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
		// Cancel Web Worker if active
		if (workerRef.current) {
			workerRef.current.postMessage({ type: "cancel" });
			workerRef.current.terminate();
			workerRef.current = null;
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
							<div className="spinner" aria-hidden="true"></div>
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
