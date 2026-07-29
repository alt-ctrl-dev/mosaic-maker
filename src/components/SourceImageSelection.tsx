import type React from "react";
import { useCallback, useState } from "react";
import { getSourceImageInfo } from "../engine/image-processing";
import type { SourceImageInfo } from "../engine/image-processing";
import type { WorkflowState } from "../engine/workflow-state";

interface SourceImageSelectionProps {
	onSourceSelected: (sourceImage: SourceImageInfo) => void;
	onSourceError: (errorMessage: string) => void;
	initialState: WorkflowState;
}

export function SourceImageSelection({
	onSourceSelected,
	onSourceError,
	initialState,
}: SourceImageSelectionProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [imageDimensions, setImageDimensions] = useState<{
		width: number;
		height: number;
	} | null>(null);

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

				// Create preview
				const url = URL.createObjectURL(file);
				setPreviewUrl(url);
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
				style={{ width: "100%", height: "200px", border: "2px dashed #ccc" }}
				aria-label="Drop images here or click to select"
			>
				<p>Drop images here or click below</p>
			</button>
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={(e) => handleFileChange(e.target.files)}
				disabled={isProcessing}
				aria-label="Select source image"
			/>

			{initialState.sourceImageError && (
				<div className="error-message" role="alert">
					{initialState.sourceImageError}
				</div>
			)}

			{previewUrl && imageDimensions && (
				<div className="image-preview">
					<img
						src={previewUrl}
						alt="Source"
						style={{ maxWidth: "100%", height: "auto" }}
					/>
					<p>
						Dimensions: {imageDimensions.width} × {imageDimensions.height}{" "}
						pixels
					</p>
				</div>
			)}

			{isProcessing && (
				<div className="processing-indicator">Processing image...</div>
			)}
		</div>
	);
}
