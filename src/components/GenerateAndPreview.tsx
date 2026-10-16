import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	adjustedTesseraSizeAtom,
	completeMosaicAtom,
	discardMosaicAtom,
	modeAtom,
	mosaicResultAtom,
	sourceImageAtom,
	tesseraeAtom,
} from "../atoms/workflow-atoms";
import type { SourceImageInfo } from "../engine/image-processing";
import { generateMosaic, type ProgressCallback } from "../engine/mosaic-engine";
import { ANDROID_READBACK_FAILURE } from "../engine/mosaic-shared";
import { vibrate } from "../haptics";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
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

/** Number of sprite cells in the generation progress grid (16 × 9). */
const PROGRESS_CELL_COUNT = 144;

/** Stable identities for the static progress cells. */
const PROGRESS_CELL_IDS = Array.from(
	{ length: PROGRESS_CELL_COUNT },
	(_, i) => `progress-cell-${i}`,
);

const styles = stylex.create({
	progressPanel: { textAlign: "center" },
	// Generation progress rendered as sprite cells filling row by row;
	// the container background forms the 1px keylines between cells.
	cellGrid: {
		display: "grid",
		gridTemplateColumns: "repeat(16, 1fr)",
		gap: "2px",
		maxWidth: "20rem",
		margin: "0.5rem auto",
		padding: "2px",
		backgroundColor: tokens.border,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	cell: {
		aspectRatio: "1",
		backgroundColor: {
			default: tokens.surface,
		},
		transition: "background-color 0.15s ease-out",
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	cellFilled: { backgroundColor: tokens.valid },
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
 * generated mosaic preview. Reads its inputs from the workflow atoms.
 */
export function GenerateAndPreview() {
	const mode = useAtomValue(modeAtom);
	const sourceImage = useAtomValue(sourceImageAtom);
	const adjustedTesseraSize = useAtomValue(adjustedTesseraSizeAtom);
	const tesserae = useAtomValue(tesseraeAtom);
	// The finished mosaic is workflow state; the preview renders from it.
	const mosaicResult = useAtomValue(mosaicResultAtom);
	const completeMosaic = useSetAtom(completeMosaicAtom);
	const discardMosaic = useSetAtom(discardMosaicAtom);

	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState<{
		percent: number;
		message: string;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

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
		if (!sourceImage || !adjustedTesseraSize) {
			setError("Missing source image or tile size");
			return;
		}

		terminateWorker();

		const tesseraSize = adjustedTesseraSize;
		const generationId = ++generationIdRef.current;
		generationStartTimeRef.current = performance.now();

		setIsGenerating(true);
		setError(null);
		setProgress(null);
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
								mode,
								"worker",
							);
							if (success) {
								vibrate(MOSAIC_COMPLETE_VIBRATION);
								completeMosaic({
									dataUrl: data.dataUrl,
									width: data.width,
									height: data.height,
								});
							} else {
								discardMosaic();
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
								discardMosaic();
								setIsGenerating(false);
								trackMosaicGeneration(
									false,
									performance.now() - generationStartTimeRef.current,
									sourceImage.width,
									sourceImage.height,
									tesseraSize,
									mode,
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
					tesserae: tesserae.map((tessera) => ({
						fileName: tessera.fileName,
						isValid: tessera.isValid,
						previewUrl: tessera.previewUrl,
						color: tessera.color,
					})),
					tesseraSize,
					mode: mode,
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
		sourceImage: SourceImageInfo,
		tesseraSize: number,
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
				tesserae,
				tesseraSize,
				mode,
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
				mode,
				"main_thread",
				fallbackReason,
			);

			setProgress({ percent: 100, message: "Mosaic generated successfully" });
			vibrate(MOSAIC_COMPLETE_VIBRATION);

			completeMosaic(result);
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
			discardMosaic();

			const totalTime = performance.now() - generationStartTimeRef.current;

			trackMosaicGeneration(
				false,
				totalTime,
				sourceImage.width,
				sourceImage.height,
				tesseraSize,
				mode,
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
		if (sourceImage && adjustedTesseraSize) {
			trackMosaicGeneration(
				false,
				performance.now() - generationStartTimeRef.current,
				sourceImage.width,
				sourceImage.height,
				adjustedTesseraSize,
				mode,
				generationPathRef.current.executionPath,
				generationPathRef.current.fallbackReason,
			);
		}
		terminateWorker();

		setIsGenerating(false);
		setError(null);
		setProgress(null);
		discardMosaic();
	};

	const canGenerate =
		sourceImage !== null &&
		adjustedTesseraSize !== null &&
		(mode === "brick" ? tesserae.length >= 2 : tesserae.length > 0);

	const filledProgressCells = progress
		? Math.round((progress.percent / 100) * PROGRESS_CELL_COUNT)
		: 0;

	const errorPanelProps = stylex.props(base.card);
	const progressPanelProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.progressPanel,
	);

	return (
		<div>
			{!isGenerating && !mosaicResult && (
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
							Please ensure you have a source image, tile size, and tiles before
							generating.
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
							<div {...stylex.props(styles.cellGrid)} aria-hidden="true">
								{PROGRESS_CELL_IDS.map((cellId, index) => (
									<div
										key={cellId}
										{...stylex.props(
											styles.cell,
											index < filledProgressCells && styles.cellFilled,
										)}
									/>
								))}
							</div>
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

			{!isGenerating && mosaicResult && (
				<div>
					<h3 {...stylex.props(base.heading, base.h3)}>Preview</h3>
					<div {...stylex.props(styles.previewContainer)}>
						<img
							src={mosaicResult.dataUrl}
							alt="Generated mosaic preview"
							{...stylex.props(styles.mosaicPreview)}
						/>
					</div>
					<p {...stylex.props(base.paragraph)}>
						Dimensions: {mosaicResult.width} × {mosaicResult.height} pixels
					</p>
				</div>
			)}
		</div>
	);
}
