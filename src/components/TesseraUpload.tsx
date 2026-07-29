import type React from "react";
import { useCallback, useState } from "react";
import type { TesseraInfo } from "../engine/workflow-state";
import { processTesserae } from "../engine/tessera-processing";

interface TesseraUploadProps {
	onTesseraeProcessed: (tesserae: TesseraInfo[]) => void;
	adjustedTesseraSize: number;
}

export function TesseraUpload({
	onTesseraeProcessed,
	adjustedTesseraSize,
}: TesseraUploadProps) {
	const [isProcessing, setIsProcessing] = useState(false);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			// Convert FileList to File[]
			const filesArray = Array.from(files);

			setIsProcessing(true);
			try {
				const tesserae = await processTesserae(filesArray, adjustedTesseraSize);
				onTesseraeProcessed(tesserae);
			} catch (error) {
				console.error("Error processing tesserae:", error);
				// In a real implementation, we would show an error message to the user
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
		<div
			className="tessera-upload"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={(e) => handleFileChange(e.target.files)}
				multiple
				disabled={isProcessing}
				aria-label="Upload tesserae images"
			/>

			<p>Supported formats: JPEG, PNG, WebP</p>

			{isProcessing && (
				<div className="processing-indicator">Processing tesserae...</div>
			)}
		</div>
	);
}
