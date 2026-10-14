import type React from "react";
import { useCallback, useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { processTesserae } from "../engine/tessera-processing";
import type { TesseraInfo } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { vibrate } from "../haptics";
import { trackError, trackStepView } from "../telemetry";
import {
	isFileSizeExceeded,
	isTotalRetainedSizeExceeded,
	isTesseraFileLimitExceeded,
	isDimensionLimitExceeded,
	getFileSizeErrorMessage,
	getTotalSizeErrorMessage,
	getFileCountErrorMessage,
	getDimensionErrorMessage,
} from "../engine/resource-policy";

const styles = stylex.create({
	root: { flex: 1 },
	controlGroup: {
		margin: 0,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderRadius: tokens.radius,
		padding: "1rem",
	},
	panelSpacing: { marginTop: "1rem", textAlign: "center" },
});

/** Props for {@link TesseraUpload}. */
interface TesseraUploadProps {
	/** Called with the processed tesserae when upload completes. */
	onTesseraeProcessed: (tesserae: TesseraInfo[]) => void;
	/** Tessera pixel size to validate uploaded images against. */
	adjustedTesseraSize: number;
	/** Current tesserae collection for cumulative size checking. */
	currentTesserae: TesseraInfo[];
}

/**
 * Drop zone and file input for uploading tessera images.
 */
export function TesseraUpload({
	onTesseraeProcessed,
	adjustedTesseraSize,
	currentTesserae,
}: TesseraUploadProps) {
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		trackStepView("tessera_upload");
	}, []);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			const filesArray = Array.from(files);

			// Check file count limit
			if (
				isTesseraFileLimitExceeded(currentTesserae.length, filesArray.length)
			) {
				const error = new Error(getFileCountErrorMessage());
				trackError("tessera_processing", error, {
					fileCount: filesArray.length,
					currentTesseraeCount: currentTesserae.length,
				});
				return;
			}

			// Check total retained size limit
			const currentFiles = currentTesserae
				.map((t) => t.file)
				.filter((file): file is File => file !== undefined);
			if (isTotalRetainedSizeExceeded(currentFiles, filesArray)) {
				const error = new Error(getTotalSizeErrorMessage());
				trackError("tessera_processing", error, {
					fileCount: filesArray.length,
					totalFileSize: filesArray.reduce((sum, file) => sum + file.size, 0),
				});
				return;
			}

			// Check individual file sizes
			for (const file of filesArray) {
				if (isFileSizeExceeded(file)) {
					const error = new Error(getFileSizeErrorMessage(file.name));
					trackError("tessera_processing", error, {
						fileName: file.name,
						fileSize: file.size,
					});
					return;
				}
			}

			setIsProcessing(true);
			try {
				const tesserae = await processTesserae(filesArray, adjustedTesseraSize);

				// Check dimension limits for each tessera after processing
				for (let i = 0; i < tesserae.length; i++) {
					const tessera = tesserae[i];
					if (tessera.isValid && tessera.file) {
						const img = new Image();
						const url = URL.createObjectURL(tessera.file);

						try {
							await new Promise((resolve, reject) => {
								img.onload = () => {
									resolve(img);
								};
								img.onerror = reject;
								img.src = url;
							});

							if (
								img.width &&
								img.height &&
								isDimensionLimitExceeded(img.width, img.height)
							) {
								const error = new Error(
									getDimensionErrorMessage(img.width, img.height),
								);
								trackError("tessera_dimension_limit", error, {
									fileName: tessera.file.name,
									width: img.width,
									height: img.height,
								});
								// Mark this tessera as invalid due to dimension limits
								tessera.isValid = false;
								tessera.error = error.message;
								tessera.isLowResolution = false;
								tessera.previewUrl = null;
							}
						} catch (error) {
							// Handle image loading errors
							console.warn("Failed to load image for dimension check:", error);
						} finally {
							URL.revokeObjectURL(url);
						}
					}
				}

				onTesseraeProcessed(tesserae);
				vibrate(15);
			} catch (error) {
				console.error("Error processing tesserae:", error);
				trackError("tessera_processing", error, {
					fileCount: files?.length,
					adjustedTesseraSize,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[adjustedTesseraSize, currentTesserae, onTesseraeProcessed],
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

	const processingProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.panelSpacing,
	);

	return (
		<section
			{...stylex.props(styles.root)}
			role="region"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			aria-busy={isProcessing}
			data-testid="tessera-upload"
		>
			<fieldset
				{...stylex.props(base.fieldset, styles.controlGroup)}
				aria-label="Upload Tesserae"
			>
				<legend {...stylex.props(base.legend)}>Upload your own images</legend>
				<div
					{...stylex.props(base.dropZone, isProcessing && base.dropZoneActive)}
				>
					<p {...stylex.props(base.paragraph)}>
						Drop tesserae images here or click below
					</p>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(e) => handleFileChange(e.target.files)}
						multiple
						disabled={isProcessing}
						aria-label="Upload tesserae images"
						{...stylex.props(base.fileInput, base.focusOutline)}
					/>
				</div>

				<p {...stylex.props(base.paragraph)}>
					Supported formats: JPEG, PNG, WebP
				</p>
			</fieldset>

			{isProcessing && (
				<article
					{...processingProps}
					className={`processing-indicator ${processingProps.className}`}
					aria-busy="true"
				>
					Processing tesserae...
				</article>
			)}
		</section>
	);
}
