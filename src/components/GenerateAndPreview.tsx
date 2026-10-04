import { useCallback, useEffect, useRef, useState } from "react";
import { generateMosaic, type ProgressCallback } from "../engine/mosaic-engine";
import { ANDROID_READBACK_FAILURE } from "../engine/mosaic-shared";
import type { WorkflowState } from "../engine/workflow-state";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";
import { trackError, trackMosaicGeneration, trackStepView } from "../telemetry";

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
	const generationStartTimeRef = useRef(0);
	const generationIdRef = useRef(0);
	const generationPathRef = useRef<{
		executionPath: "worker" | "main_thread";
		fallbackReason?: "android_readback" | "worker_unavailable";
	}>({ executionPath: "worker" });

	const terminateWorker = useCallback(() => {
		if (workerRef.current) {
			workerRef.current.terminate();
			workerRef.current = null;
		}
	}, []);

	useEffect(() => {
		trackStepView("generate_and_preview");
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

		terminateWorker();

		const sourceImage = state.sourceImage;
		const tesseraSize = state.adjustedTesseraSize;
		const generationId = ++generationIdRef.current;
		generationStartTimeRef.current = performance.now();

		setIsGenerating(true);
		setError(null);
		setProgress(null);
		setPreviewUrl(null);
		setPreviewDimensions(null);
		generationPathRef.current =
			typeof Worker !== "undefined"
				? { executionPath: "worker" }
				: {
						executionPath: "main_thread",
						fallbackReason: "worker_unavailable",
					};

		if (typeof Worker !== "undefined") {
			try {
				const WorkerConstructor = (
					await import("../engine/mosaic-worker.ts?worker")
				).default;
				if (generationId !== generationIdRef.current) return;
				workerRef.current = new WorkerConstructor();

				workerRef.current.onmessage = (event) => {
					if (generationId !== generationIdRef.current) return;
					const { type, ...data } = event.data;

					switch (type) {
						case "progress":
							setProgress({ percent: data.percent, message: data.message });
							break;
						case "result": {
							const success = Boolean(data.dataUrl);
							const duration =
								performance.now() - generationStartTimeRef.current;
							trackMosaicGeneration(
								success,
								duration,
								sourceImage.width,
								sourceImage.height,
								tesseraSize,
								state.mode,
								"worker",
							);
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
									tesseraSize,
									"android_readback",
									generationId,
									ANDROID_FALLBACK_ERROR_MESSAGE,
								);
							} else {
								setError(data.message);
								dispatch({ type: "generationCancelledOrFailed" });
								setIsGenerating(false);
								trackMosaicGeneration(
									false,
									performance.now() - generationStartTimeRef.current,
									sourceImage.width,
									sourceImage.height,
									tesseraSize,
									state.mode,
									"worker",
								);
								terminateWorker();
							}
							break;
					}
				};

				workerRef.current.postMessage({
					type: "generate",
					sourceImage,
					tesserae: state.tesserae.map((tessera) => ({
						fileName: tessera.fileName,
						isValid: tessera.isValid,
						previewUrl: tessera.previewUrl,
						color: tessera.color,
					})),
					tesseraSize,
					mode: state.mode,
				});
			} catch (err) {
				if (generationId !== generationIdRef.current) return;
				terminateWorker();
				console.warn(
					"Web Worker not supported or failed, falling back to main thread",
					err,
				);
				trackError("mosaic_generation_worker_init", err);
				await generateOnMainThread(
					sourceImage,
					tesseraSize,
					"worker_unavailable",
					generationId,
				);
			}
		} else {
			await generateOnMainThread(
				sourceImage,
				tesseraSize,
				"worker_unavailable",
				generationId,
			);
		}
	};

	const generateOnMainThread = async (
		sourceImage: NonNullable<WorkflowState["sourceImage"]>,
		tesseraSize: NonNullable<WorkflowState["adjustedTesseraSize"]>,
		fallbackReason: "android_readback" | "worker_unavailable",
		generationId: number,
		fallbackErrorMessage?: string,
	) => {
		generationPathRef.current = {
			executionPath: "main_thread",
			fallbackReason,
		};

		const progressCallback: ProgressCallback = (percent, message) => {
			if (generationId === generationIdRef.current)
				setProgress({ percent, message });
		};

		try {
			const result = await generateMosaic(
				sourceImage,
				state.tesserae,
				tesseraSize,
				state.mode,
				undefined,
				undefined,
				progressCallback,
			);

			if (generationId !== generationIdRef.current) return;
			const totalTime = performance.now() - generationStartTimeRef.current;

			trackMosaicGeneration(
				true,
				totalTime,
				sourceImage.width,
				sourceImage.height,
				tesseraSize,
				state.mode,
				"main_thread",
				fallbackReason,
			);

			setProgress({ percent: 100, message: "Mosaic generated successfully" });
			setPreviewUrl(result.dataUrl);
			setPreviewDimensions({ width: result.width, height: result.height });

			dispatch({ type: "mosaicGenerated", mosaicResult: result });
		} catch (err) {
			if (generationId !== generationIdRef.current) return;
			if (fallbackErrorMessage) {
				console.error("Main-thread fallback failed:", err);
				setError(fallbackErrorMessage);
				trackError("mosaic_generation_android_fallback", err, {
					sourceWidth: sourceImage.width,
					sourceHeight: sourceImage.height,
					tesseraSize,
				});
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Unknown error occurred");
			}
			dispatch({ type: "generationCancelledOrFailed" });

			const totalTime = performance.now() - generationStartTimeRef.current;

			trackMosaicGeneration(
				false,
				totalTime,
				sourceImage.width,
				sourceImage.height,
				tesseraSize,
				state.mode,
				"main_thread",
				fallbackReason,
			);
		} finally {
			if (generationId === generationIdRef.current) setIsGenerating(false);
		}
	};

	const handleCancel = () => {
		++generationIdRef.current;
		workerRef.current?.postMessage({ type: "cancel" });
		if (state.sourceImage && state.adjustedTesseraSize) {
			trackMosaicGeneration(
				false,
				performance.now() - generationStartTimeRef.current,
				state.sourceImage.width,
				state.sourceImage.height,
				state.adjustedTesseraSize,
				state.mode,
				generationPathRef.current.executionPath,
				generationPathRef.current.fallbackReason,
			);
		}
		terminateWorker();

		setIsGenerating(false);
		setError(null);
		setProgress(null);
		dispatch({ type: "generationCancelledOrFailed" });
	};

	const canGenerate =
		state.sourceImage !== null &&
		state.adjustedTesseraSize !== null &&
		(state.mode === "brick"
			? state.tesserae.length >= 2
			: state.tesserae.length > 0);

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
