import { useState, useEffect, useRef, useCallback } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import { generateMosaic, type ProgressCallback } from "../engine/mosaic-engine";
import { ANDROID_READBACK_FAILURE } from "../engine/mosaic-shared";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";
import { getSessionId, track } from "../analytics";
import { estimateWorkload } from "../engine/device-capacity-preflight";

/** Props for {@link GenerateAndPreview}. */
interface GenerateAndPreviewProps {
	/** Current workflow state, used for source image, tesserae, and tessera size. */
	state: WorkflowState;
	/** Dispatches workflow actions for mosaic generation results and cancellations. */
	dispatch: (action: WorkflowAction) => void;
}

/**
 * User-facing error shown when the Android main-thread fallback also fails,
 * meaning the mosaic could not be generated on the current device.
 */
const ANDROID_FALLBACK_ERROR_MESSAGE =
	"Unable to generate mosaic on your device. Please try again or use a different browser.";

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

	const terminateWorker = useCallback(() => {
		if (workerRef.current) {
			workerRef.current.terminate();
			workerRef.current = null;
		}
	}, []);

	useEffect(() => {
		if (isGenerating) {
			window.addEventListener("beforeunload", beforeUnloadRef.current);
		} else {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
		}

		return () => {
			window.removeEventListener("beforeunload", beforeUnloadRef.current);
			terminateWorker();
		};
	}, [isGenerating, terminateWorker]);

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

		if (typeof Worker !== "undefined") {
			try {
				const sourceImage = state.sourceImage;
				const adjustedTesseraSize = state.adjustedTesseraSize;
				const WorkerConstructor = (
					await import("../engine/mosaic-worker.ts?worker")
				).default;
				workerRef.current = new WorkerConstructor();

				workerRef.current.onmessage = (event) => {
					const { type, ...data } = event.data;

					switch (type) {
						case "progress":
							setProgress({ percent: data.percent, message: data.message });
							break;
						case "timing":
							track("mosaic_generation", data.data);
							break;
						case "result": {
							const success = Boolean(data.dataUrl);
							if (success) {
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
								dispatch({ type: "generationCancelledOrFailed" });
							}
							setIsGenerating(false);
							terminateWorker();
							break;
						}
						case "error":
							if (data.message?.includes(ANDROID_READBACK_FAILURE)) {
								console.warn(
									"Android browser limitation detected, falling back to main thread processing",
								);
								terminateWorker();
								generateOnMainThread(
									sourceImage,
									adjustedTesseraSize,
									ANDROID_FALLBACK_ERROR_MESSAGE,
								);
							} else {
								setError(data.message);
								dispatch({ type: "generationCancelledOrFailed" });
								setIsGenerating(false);
								terminateWorker();
							}
							break;
					}
				};

				workerRef.current.postMessage({
					type: "generate",
					sourceImage: state.sourceImage,
					tesserae: state.tesserae.map((tessera) => ({
						fileName: tessera.fileName,
						isValid: tessera.isValid,
						previewUrl: tessera.previewUrl,
					})),
					tesseraSize: state.adjustedTesseraSize,
					sessionId: getSessionId(),
				});
			} catch (err) {
				console.warn(
					"Web Worker not supported or failed, falling back to main thread",
					err,
				);
				await generateOnMainThread(
					state.sourceImage,
					state.adjustedTesseraSize,
				);
			}
		} else {
			await generateOnMainThread(state.sourceImage, state.adjustedTesseraSize);
		}
	};

	const generateOnMainThread = async (
		sourceImage: NonNullable<WorkflowState["sourceImage"]>,
		tesseraSize: NonNullable<WorkflowState["adjustedTesseraSize"]>,
		fallbackErrorMessage?: string,
	) => {
		const startTime = performance.now();
		const phaseTimings: Record<string, number> = {};
		let currentPhaseStart = startTime;

		const gridCellCount =
			Math.ceil(sourceImage.width / tesseraSize) *
			Math.ceil(sourceImage.height / tesseraSize);
		const validTesserae = state.tesserae.filter((t) => t.isValid);
		const workload = estimateWorkload(
			gridCellCount,
			validTesserae.length,
			sourceImage.width,
			sourceImage.height,
		);

		const progressCallback: ProgressCallback = (percent, message) => {
			const now = performance.now();
			if (
				message.includes("Loading source") &&
				!("loading_source" in phaseTimings)
			) {
				phaseTimings.loading_source = now - currentPhaseStart;
				currentPhaseStart = now;
			} else if (
				message.includes("Processing tessera") &&
				!("processing_tesserae" in phaseTimings)
			) {
				phaseTimings.processing_tesserae = now - currentPhaseStart;
				currentPhaseStart = now;
			} else if (
				message.includes("Generating") &&
				!("generating_mosaic" in phaseTimings)
			) {
				phaseTimings.generating_mosaic = now - currentPhaseStart;
				currentPhaseStart = now;
			} else if (
				message.includes("Finalizing mosaic") &&
				!("finalizing_mosaic" in phaseTimings)
			) {
				phaseTimings.finalizing_mosaic = now - currentPhaseStart;
				currentPhaseStart = now;
			}
			setProgress({ percent, message });
		};

		try {
			const result = await generateMosaic(
				sourceImage,
				state.tesserae,
				tesseraSize,
				undefined,
				undefined,
				progressCallback,
			);

			const endTime = performance.now();
			phaseTimings.final = endTime - currentPhaseStart;
			const totalTime = endTime - startTime;

			setProgress({ percent: 100, message: "Mosaic generated successfully" });
			setPreviewUrl(result.dataUrl);
			setPreviewDimensions({ width: result.width, height: result.height });

			track("mosaic_generation", {
				outcome: "completed",
				totalTime,
				phases: phaseTimings,
				sessionId: getSessionId(),
				gridCellCount: workload.gridCellCount,
				tesseraCount: workload.tesseraCount,
				outputPixels: workload.outputPixels,
				estimatedMemoryUsage: workload.estimatedMemoryUsage,
			});

			dispatch({ type: "mosaicGenerated", mosaicResult: result });
		} catch (err) {
			if (fallbackErrorMessage) {
				console.error("Main-thread fallback failed:", err);
				setError(fallbackErrorMessage);
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Unknown error occurred");
			}
			dispatch({ type: "generationCancelledOrFailed" });

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			track("mosaic_generation", {
				outcome: "failed",
				totalTime,
				phases: {},
				sessionId: getSessionId(),
				gridCellCount: workload.gridCellCount,
				tesseraCount: workload.tesseraCount,
				outputPixels: workload.outputPixels,
				estimatedMemoryUsage: workload.estimatedMemoryUsage,
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const handleCancel = () => {
		if (workerRef.current) {
			workerRef.current.postMessage({ type: "cancel" });
		}

		setIsGenerating(false);
		setError(null);
		setProgress(null);
	};

	const canGenerate =
		state.sourceImage !== null &&
		state.adjustedTesseraSize !== null &&
		state.tesserae.length > 0;

	return (
		<div className="generate-preview-step">
			{!isGenerating && !previewUrl && (
				<div className="generate-controls">
					<p>
						Ready to generate your mosaic? Press the "Generate Mosaic" button
						below. You can go back to the previous step anytime if needed.
					</p>
					<button
						type="button"
						className="primary"
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
						<article className="error-message" role="alert">
							<strong>Error:</strong> {error}
						</article>
					)}
				</div>
			)}

			{isGenerating && (
				<article className="generation-progress" aria-busy="true">
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
				</article>
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
