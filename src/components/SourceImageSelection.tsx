import type React from "react";
import { useCallback, useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { SourceImageInfo } from "../engine/image-processing";
import { getSourceImageInfo } from "../engine/image-processing";
import type { WorkflowState } from "../engine/workflow-state";
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

/** Props for {@link ContinueButton}. */
interface ContinueButtonProps {
	/** The processed source image to continue with. */
	sourceImage: SourceImageInfo;
	/** Called when the user chooses to continue. */
	onContinue: (sourceImage: SourceImageInfo) => void;
}

/**
 * Button that advances the workflow to the tesserae build step.
 * Encapsulates passing the selected source image back to the caller.
 */
function ContinueButton({ sourceImage, onContinue }: ContinueButtonProps) {
	return (
		<ActionButton type="button" onClick={() => onContinue(sourceImage)}>
			Continue to step 2 →
		</ActionButton>
	);
}

/** Props for {@link SourceImageSelection}. */
interface SourceImageSelectionProps {
	/** Called when a valid source image is selected and processed. */
	onSourceSelected: (sourceImage: SourceImageInfo) => void;
	/** Called when source image selection or processing fails. */
	onSourceError: (errorMessage: string) => void;
	/** Current workflow state, used to display persisted errors. */
	initialState: WorkflowState;
}

/**
 * Drop zone and file input for selecting the source image.
 * Validates file type, extracts dimensions, and shows a preview.
 */
export function SourceImageSelection({
	onSourceSelected,
	onSourceError,
	initialState,
}: SourceImageSelectionProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		initialState.sourceImage?.url ?? null,
	);
	const [imageDimensions, setImageDimensions] = useState<{
		width: number;
		height: number;
	} | null>(
		initialState.sourceImage
			? {
					width: initialState.sourceImage.width,
					height: initialState.sourceImage.height,
				}
			: null,
	);

	useEffect(() => {
		trackStepView("choose_source_image");
	}, []);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const file = files[0];
			if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
				onSourceError(
					"Unsupported file type. Please select a JPEG, PNG, or WebP image.",
				);
				return;
			}

			setIsProcessing(true);
			try {
				const sourceImage = await getSourceImageInfo(file);
				onSourceSelected(sourceImage);

				trackEvent("source_image_upload", {
					width: sourceImage.width,
					height: sourceImage.height,
					fileSize: file.size,
					fileType: file.type,
				});

				// Reuse the object URL the engine holds rather than creating a second
				// one; it lives as long as the source image is in the workflow.
				setPreviewUrl(sourceImage.url);
				setImageDimensions({
					width: sourceImage.width,
					height: sourceImage.height,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to process the image.";
				onSourceError(errorMessage);
				trackError("source_image_load", error, {
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[onSourceSelected, onSourceError],
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

			{initialState.sourceImageError && (
				<article
					{...errorPanelProps}
					className={`error-message ${errorPanelProps.className}`}
					role="alert"
				>
					{initialState.sourceImageError}
				</article>
			)}

			{previewUrl && (
				<div {...stylex.props(styles.imagePreview)}>
					<p {...stylex.props(base.paragraph)}>Source image preview:</p>
					<img
						src={previewUrl}
						alt="Source"
						{...stylex.props(styles.previewImage)}
					/>
					{imageDimensions && (
						<p {...stylex.props(base.paragraph)}>
							Dimensions: {imageDimensions.width} × {imageDimensions.height}{" "}
							pixels
						</p>
					)}
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

			{previewUrl && imageDimensions && initialState.sourceImage && (
				<ContinueButton
					sourceImage={initialState.sourceImage}
					onContinue={onSourceSelected}
				/>
			)}
		</div>
	);
}
