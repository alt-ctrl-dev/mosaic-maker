import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
	generationErrorAtom,
	generationProgressAtom,
	isGeneratingMosaicAtom,
} from "../atoms/ui-atoms";
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
import { trackError, trackMosaicGeneration, trackStepView } from "../telemetry";
import { SourceImageOverlay } from "./SourceImageOverlay";
import { ExportPanel } from "./ExportMosaic";

/** Cap on DOM cells in the tile-fill animation over the source image. */
const MAX_OVERLAY_CELLS = 2500;

/**
 * Overlay grid mirroring the mosaic grid for the chosen tile size
 * (ceil(source / tile) per axis), scaled down to MAX_OVERLAY_CELLS while
 * keeping the tile aspect ratio so huge grids stay renderable.
 */
export function overlayGridFor(
	sourceWidth: number,
	sourceHeight: number,
	tesseraSize: number,
): { cols: number; rows: number } {
	let cols = Math.max(1, Math.ceil(sourceWidth / tesseraSize));
	let rows = Math.max(1, Math.ceil(sourceHeight / tesseraSize));
	const scale = Math.sqrt(MAX_OVERLAY_CELLS / (cols * rows));
	if (scale < 1) {
		cols = Math.max(1, Math.floor(cols * scale));
		rows = Math.max(1, Math.floor(rows * scale));
	}
	return { cols, rows };
}

const styles = stylex.create({
	// Idle state: the source image centered with the generate button on top.
	// The container shrink-wraps the image so overlays sit flush on it.
	sourceContainer: {
		position: "relative",
		display: "inline-block",
		maxWidth: "100%",
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

	const [isGenerating, setIsGenerating] = useAtom(isGeneratingMosaicAtom);
	const [progress, setProgress] = useAtom(generationProgressAtom);
	const [error, setError] = useAtom(generationErrorAtom);

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

	const overlayGrid =
		sourceImage && adjustedTesseraSize
			? overlayGridFor(
					sourceImage.width,
					sourceImage.height,
					adjustedTesseraSize,
				)
			: null;
	const overlayCellCount = overlayGrid
		? overlayGrid.cols * overlayGrid.rows
		: 0;
	const filledProgressCells = progress
		? Math.round((progress.percent / 100) * overlayCellCount)
		: 0;

	const errorPanelProps = stylex.props(base.card);

	return (
		<div>
			{!mosaicResult && sourceImage && (
				<div {...stylex.props(base.sourcePreviewContainer)}>
					<div
						{...stylex.props(styles.sourceContainer)}
						aria-busy={isGenerating}
					>
						<img
							src={sourceImage.url}
							alt="Source"
							{...stylex.props(base.sourcePreviewImage)}
						/>
						<SourceImageOverlay
							isGenerating={isGenerating}
							grid={overlayGrid}
							filledCells={filledProgressCells}
							canGenerate={canGenerate}
							onGenerate={handleGenerate}
							onCancel={handleCancel}
						/>
					</div>
				</div>
			)}

			{!isGenerating && !mosaicResult && (
				<div>
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

			{!isGenerating && mosaicResult && <ExportPanel />}
		</div>
	);
}
