import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	isSelectingSourceAtom,
	isSourceDragActiveAtom,
} from "../atoms/ui-atoms";
import {
	mosaicResultAtom,
	reportSourceErrorAtom,
	resetWorkflowAtom,
	selectSourceImageAtom,
	sourceImageAtom,
	sourceImageErrorAtom,
} from "../atoms/workflow-atoms";
import { getSourceImageInfo } from "../engine/image-processing";
import {
	getDimensionErrorMessage,
	getFileSizeErrorMessage,
	isDimensionLimitExceeded,
	isFileSizeExceeded,
} from "../engine/resource-policy";
import { vibrate } from "../haptics";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackError, trackEvent, trackStepView } from "../telemetry";
import { ActionButton } from "./ActionButton";

const styles = stylex.create({
	panelSpacing: { marginTop: "1rem", textAlign: "center" },
	// Drag and drop only exists on pointer devices, so the hint only
	// renders there.
	dragHint: {
		margin: 0,
		marginTop: "0.25rem",
		fontSize: "0.875rem",
		color: tokens.muted,
		display: "none",
		"@media (hover: hover) and (pointer: fine)": { display: "block" },
	},
	dropText: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
	},
	backdrop: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
	},
	dialog: {
		backgroundColor: tokens.surface,
		color: tokens.text,
		borderRadius: tokens.radius,
		border: `0.0625rem solid ${tokens.border}`,
		padding: "1.5rem",
		maxWidth: "25rem",
		width: "90vw",
		boxShadow: tokens.shadow,
	},
	title: {
		marginTop: 0,
		marginBottom: "1rem",
		fontSize: "1.25rem",
		fontWeight: "bold",
	},
	message: {
		marginBottom: "1.5rem",
		lineHeight: 1.5,
	},
	buttonGroup: {
		display: "flex",
		gap: "0.75rem",
		justifyContent: "flex-end",
	},
	button: {
		padding: "0.5rem 1rem",
		borderRadius: tokens.radius,
		border: "none",
		cursor: "pointer",
		fontWeight: "500",
		transition: "background-color 0.2s",
	},
	cancelButton: {
		backgroundColor: tokens.surface,
		color: tokens.text,
		border: `0.0625rem solid ${tokens.border}`,
		":hover": {
			backgroundColor: tokens.secondaryHover,
		},
	},
	confirmButton: {
		backgroundColor: tokens.primary,
		color: tokens.onPrimary,
		":hover": {
			backgroundColor: tokens.primaryHover,
		},
	},
});

/** StyleX only resolves computed conditional keys defined in the same module. */
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/** The drop zone's internal grid marches while an image hovers over it. */
const gridMarch = stylex.keyframes({
	from: { backgroundPosition: "0 0, 0 0" },
	to: { backgroundPosition: "1.5rem 1.5rem, 1.5rem 1.5rem" },
});

const dragStyles = stylex.create({
	dropZoneDragging: {
		borderColor: tokens.primary,
		backgroundColor: tokens.primarySoft,
		animationName: gridMarch,
		animationDuration: "1.2s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
		[REDUCED_MOTION]: {
			animationDuration: "0.01ms",
			animationIterationCount: "1",
		},
	},
});

/**
 * Drop zone and file input for selecting the source image.
 * Validates file type, extracts dimensions, and shows a preview.
 */
export function SourceImageSelection() {
	const sourceImage = useAtomValue(sourceImageAtom);
	const sourceImageError = useAtomValue(sourceImageErrorAtom);
	const _mosaicResult = useAtomValue(mosaicResultAtom);
	const selectSourceImage = useSetAtom(selectSourceImageAtom);
	const reportSourceError = useSetAtom(reportSourceErrorAtom);
	const _resetWorkflow = useSetAtom(resetWorkflowAtom);
	const [isProcessing, setIsProcessing] = useAtom(isSelectingSourceAtom);
	const [isDragging, setIsDragging] = useAtom(isSourceDragActiveAtom);
	const [_showResetWarning, _setShowResetWarning] = useState(false);
	const [_pendingFile, _setPendingFile] = useState<FileList | null>(null);
	const dragDepth = useRef(0);

	useEffect(() => {
		trackStepView("choose_source_image");
	}, []);

	const _processFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const file = files[0];
			setIsProcessing(true);
			try {
				const sourceImageInfo = await getSourceImageInfo(file);

				if (
					isDimensionLimitExceeded(
						sourceImageInfo.width,
						sourceImageInfo.height,
					)
				) {
					reportSourceError(
						getDimensionErrorMessage(
							sourceImageInfo.width,
							sourceImageInfo.height,
						),
					);
					return;
				}

				selectSourceImage(sourceImageInfo);

				trackEvent("source_image_upload", {
					width: sourceImageInfo.width,
					height: sourceImageInfo.height,
					fileSize: file.size,
					fileType: file.type,
				});
				vibrate(10);
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to process the image.";
				reportSourceError(errorMessage);
				trackError("source_image_load", error, {
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[selectSourceImage, reportSourceError, setIsProcessing],
	);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const file = files[0];
			if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
				reportSourceError(
					"Unsupported file type. Please select a JPEG, PNG, or WebP image.",
				);
				return;
			}

			if (isFileSizeExceeded(file)) {
				reportSourceError(getFileSizeErrorMessage(file.name));
				return;
			}

			setIsProcessing(true);
			try {
				const sourceImageInfo = await getSourceImageInfo(file);

				if (
					isDimensionLimitExceeded(
						sourceImageInfo.width,
						sourceImageInfo.height,
					)
				) {
					reportSourceError(
						getDimensionErrorMessage(
							sourceImageInfo.width,
							sourceImageInfo.height,
						),
					);
					return;
				}

				selectSourceImage(sourceImageInfo);

				trackEvent("source_image_upload", {
					width: sourceImageInfo.width,
					height: sourceImageInfo.height,
					fileSize: file.size,
					fileType: file.type,
				});
				vibrate(10);
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to process the image.";
				reportSourceError(errorMessage);
				trackError("source_image_load", error, {
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[selectSourceImage, reportSourceError, setIsProcessing],
	);

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			// Depth counter: enter/leave also fire for the drop zone's children.
			dragDepth.current += 1;
			setIsDragging(true);
		},
		[setIsDragging],
	);

	const handleDragLeave = useCallback(() => {
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setIsDragging(false);
	}, [setIsDragging]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			dragDepth.current = 0;
			setIsDragging(false);
			handleFileChange(e.dataTransfer.files);
		},
		[handleFileChange, setIsDragging],
	);

	const errorPanelProps = stylex.props(base.card);
	const processingProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.panelSpacing,
	);

	return (
		<div>
			<button
				type="button"
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				{...stylex.props(
					base.dropZone,
					base.focusOutline,
					isDragging && dragStyles.dropZoneDragging,
				)}
				aria-label="Tap or click here to choose a source image"
			>
				<div {...stylex.props(styles.dropText)}>
					<p {...stylex.props(base.paragraph)}>
						{isDragging
							? "Release to place your source image on the bench"
							: "Tap or click here to choose a source image"}
					</p>
					{!isDragging && (
						<p {...stylex.props(styles.dragHint)}>or drag and drop one here</p>
					)}
				</div>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(e) => handleFileChange(e.target.files)}
					disabled={isProcessing}
					aria-label="Select source image"
					{...stylex.props(base.fileInput, base.focusOutline)}
				/>
			</button>

			{sourceImageError && (
				<article
					{...errorPanelProps}
					className={`error-message ${errorPanelProps.className}`}
					role="alert"
				>
					{sourceImageError}
				</article>
			)}

			{sourceImage && (
				<div {...stylex.props(base.sourcePreviewContainer)}>
					<p {...stylex.props(base.paragraph)}>Source image preview:</p>
					{/* Reuses the object URL the engine holds rather than creating a
					    second one; it lives as long as the source image is selected. */}
					<img
						src={sourceImage.url}
						alt="Source"
						{...stylex.props(base.sourcePreviewImage)}
					/>
					<p {...stylex.props(base.paragraph)}>
						Dimensions: {sourceImage.width} × {sourceImage.height} pixels
					</p>
				</div>
			)}

			{isProcessing && (
				<article
					{...processingProps}
					className={`processing-indicator ${processingProps.className}`}
					aria-busy="true"
				>
					Processing image...
				</article>
			)}

			{sourceImage && (
				<ActionButton
					type="button"
					onClick={() => selectSourceImage(sourceImage)}
				>
					Continue to step 2 →
				</ActionButton>
			)}
		</div>
	);
}
