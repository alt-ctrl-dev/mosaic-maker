import type React from "react";
import { useCallback, useState } from "react";
import { getSourceImageInfo } from "../engine/image-processing";
import type { SourceImageInfo } from "../engine/image-processing";
import type { WorkflowState } from "../engine/workflow-state";

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
		<button
			type="button"
			className="secondary"
			onClick={() => onContinue(sourceImage)}
		>
			Continue to Build Tesserae →
		</button>
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

	return (
		<div className="source-image-selection">
			<button
				type="button"
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				className="drop-zone"
				aria-label="Drop images here or click to select"
			>
				<p>Drop images here or click below</p>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(e) => handleFileChange(e.target.files)}
					disabled={isProcessing}
					aria-label="Select source image"
					className="file-input"
				/>
			</button>

			{initialState.sourceImageError && (
				<article className="error-message" role="alert">
					{initialState.sourceImageError}
				</article>
			)}

			{previewUrl && imageDimensions && (
				<div className="image-preview">
					<img src={previewUrl} alt="Source" className="preview-image" />
					<p>
						Dimensions: {imageDimensions.width} × {imageDimensions.height}{" "}
						pixels
					</p>
				</div>
			)}

			{isProcessing && (
				<article className="processing-indicator" aria-busy="true">
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
