import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { processTesserae } from "../engine/tessera-processing";
import type { TesseraInfo } from "../engine/workflow-state";
import { trackError, trackStepView } from "../telemetry";

/** Props for {@link TesseraUpload}. */
interface TesseraUploadProps {
	/** Called with the processed tesserae when upload completes. */
	onTesseraeProcessed: (tesserae: TesseraInfo[]) => void;
	/** Tessera pixel size to validate uploaded images against. */
	adjustedTesseraSize: number;
}

/**
 * Drop zone and file input for uploading tessera images.
 */
export function TesseraUpload({
	onTesseraeProcessed,
	adjustedTesseraSize,
}: TesseraUploadProps) {
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		trackStepView("tessera_upload");
	}, []);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const filesArray = Array.from(files);

			setIsProcessing(true);
			try {
				const tesserae = await processTesserae(filesArray, adjustedTesseraSize);
				onTesseraeProcessed(tesserae);
			} catch (error) {
				console.error("Error processing tesserae:", error);
				trackError("tessera_processing", error as Error, {
					fileCount: files?.length,
					adjustedTesseraSize,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[adjustedTesseraSize, onTesseraeProcessed],
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
		<section
			className="tessera-upload"
			role="region"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			aria-busy={isProcessing}
			data-testid="tessera-upload"
		>
			<fieldset className="control-group" aria-label="Upload Tesserae">
				<legend>Upload your own images</legend>
				<div className="drop-zone">
					<p>Drop tesserae images here or click below</p>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => handleFileChange(e.target.files)}
						multiple
						disabled={isProcessing}
						aria-label="Upload tesserae images"
						className="file-input"
					/>
				</div>

				<p className="hint">Supported formats: JPEG, PNG, WebP</p>
			</fieldset>

			{isProcessing && (
				<article className="processing-indicator" aria-busy="true">
					Processing tesserae...
				</article>
			)}
		</section>
	);
}
