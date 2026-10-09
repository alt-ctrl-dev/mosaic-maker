import { useCallback, useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { generateMosaic, type ProgressCallback } from "../engine/mosaic-engine";
import { ANDROID_READBACK_FAILURE } from "../engine/mosaic-shared";
import type { WorkflowState } from "../engine/workflow-state";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { vibrate } from "../haptics";
import { trackError, trackMosaicGeneration, trackStepView } from "../telemetry";
import { ActionButton } from "./ActionButton";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

// Keyframes must be defined in the same module: StyleX does not resolve
// imported keyframe bindings in animation values.
const spin = stylex.keyframes({
	to: { transform: "rotate(360deg)" },
});

/** Pop-in for the finished mosaic preview. Local because StyleX does not
 * resolve imported keyframe bindings. */
const previewIn = stylex.keyframes({
	from: { opacity: 0, transform: "scale(0.98)" },
	to: { opacity: 1, transform: "none" },
});

const styles = stylex.create({
	progressPanel: { textAlign: "center" },
	progressBar: {
		width: "100%",
		margin: "0.5rem 0",
		accentColor: tokens.primary,
	},
	spinner: {
		width: "2rem",
		height: "2rem",
		borderWidth: "3px",
		borderStyle: "solid",
		borderColor: tokens.text,
		borderTopWidth: "3px",
		borderTopStyle: "solid",
		borderTopColor: tokens.primary,
		borderRadius: "50%",
		animationName: spin,
		animationDuration: "1s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
		margin: "0 auto 1rem",
		[REDUCED_MOTION]: {
			animationDuration: "0.01ms",
			animationIterationCount: 1,
		},
	},
	previewContainer: { margin: "1rem 0", textAlign: "center" },
	mosaicPreview: {
		maxWidth: "100%",
		maxHeight: "70vh",
		width: "auto",
		height: "auto",
		borderRadius: tokens.radius,
		boxShadow: tokens.shadow,
		animationName: previewIn,
		animationDuration: "0.3s",
		animationTimingFunction: "ease-out",
		[REDUCED_MOTION]: { animationDuration: "0.01ms" },
	},
});

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

/** Success haptic pattern for a finished mosaic. */
const MOSAIC_COMPLETE_VIBRATION = [30, 50, 30];

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
								vibrate(MOSAIC_COMPLETE_VIBRATION);
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
			vibrate(MOSAIC_COMPLETE_VIBRATION);

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

	const errorPanelProps = stylex.props(base.card);
	const progressPanelProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.progressPanel,
	);

	return (
		<div>
			{!isGenerating && !previewUrl && (
				<div>
					<p {...stylex.props(base.paragraph)}>
						Ready to generate your mosaic? Press the "Generate Mosaic" button
						below. You can go back to the previous step anytime if needed.
					</p>
					<ActionButton
						type="button"
						onClick={handleGenerate}
						disabled={!canGenerate || isGenerating}
						aria-busy={isGenerating}
					>
						Generate Mosaic
					</ActionButton>

					{!canGenerate && (
						<p {...stylex.props(base.paragraph)}>
							Please ensure you have a source image, tessera size, and tesserae
							before generating.
						</p>
					)}

					{error && (
						<article
							{...errorPanelProps}
							className={`error-message ${errorPanelProps.className}`}
							role="alert"
						>
							<strong>Error:</strong> {error}
						</article>
					)}
				</div>
			)}

			{isGenerating && (
				<article
					{...progressPanelProps}
					className={`generation-progress ${progressPanelProps.className}`}
					aria-busy="true"
				>
					<h3 {...stylex.props(base.heading, base.h3)}>Generating Mosaic...</h3>
					{progress ? (
						<div>
							<progress
								{...stylex.props(styles.progressBar)}
								value={progress.percent}
								max="100"
								aria-label="Generation progress"
							>
								{progress.percent}%
							</progress>
							<p {...stylex.props(base.paragraph)}>{progress.message}</p>
						</div>
					) : (
						<div>
							<div {...stylex.props(styles.spinner)} aria-hidden="true" />
							<p {...stylex.props(base.paragraph)}>Processing...</p>
						</div>
					)}
					<ActionButton type="button" onClick={handleCancel} variant="outline">
						Cancel
					</ActionButton>
				</article>
			)}

			{previewUrl && previewDimensions && (
				<div>
					<h3 {...stylex.props(base.heading, base.h3)}>Preview</h3>
					<div {...stylex.props(styles.previewContainer)}>
						<img
							src={previewUrl}
							alt="Generated mosaic preview"
							{...stylex.props(styles.mosaicPreview)}
						/>
					</div>
					<p {...stylex.props(base.paragraph)}>
						Dimensions: {previewDimensions.width} × {previewDimensions.height}{" "}
						pixels
					</p>
				</div>
			)}
		</div>
	);
}
