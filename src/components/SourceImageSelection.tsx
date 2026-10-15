import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import {
	reportSourceErrorAtom,
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
	imagePreview: { marginTop: "1rem" },
	previewImage: {
		maxWidth: "100%",
		height: "auto",
		borderRadius: tokens.radius,
		boxShadow: tokens.shadow,
	},
	panelSpacing: { marginTop: "1rem", textAlign: "center" },
});

/**
 * Drop zone and file input for selecting the source image.
 * Validates file type, extracts dimensions, and shows a preview.
 */
export function SourceImageSelection() {
	const sourceImage = useAtomValue(sourceImageAtom);
	const sourceImageError = useAtomValue(sourceImageErrorAtom);
	const selectSourceImage = useSetAtom(selectSourceImageAtom);
	const reportSourceError = useSetAtom(reportSourceErrorAtom);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		trackStepView("choose_source_image");
	}, []);

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
		[selectSourceImage, reportSourceError],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			handleFileChange(e.dataTransfer.files);
		},
		[handleFileChange],
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
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				{...stylex.props(base.dropZone, base.focusOutline)}
				aria-label="Drop images here or click to select"
			>
				<p {...stylex.props(base.paragraph)}>Drop images here or click below</p>
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
				<div {...stylex.props(styles.imagePreview)}>
					<p {...stylex.props(base.paragraph)}>Source image preview:</p>
					{/* Reuses the object URL the engine holds rather than creating a
					    second one; it lives as long as the source image is selected. */}
					<img
						src={sourceImage.url}
						alt="Source"
						{...stylex.props(styles.previewImage)}
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
