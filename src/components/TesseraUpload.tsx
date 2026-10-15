import type React from "react";
import { useCallback, useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { processTesserae } from "../engine/tessera-processing";
import type { TesseraInfo } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { vibrate } from "../haptics";
import { getTelemetry } from "../telemetry-service";
import {
	isFileSizeExceeded,
	isTotalRetainedSizeExceeded,
	isTesseraFileLimitExceeded,
	isDimensionLimitExceeded,
	getImageDimensions,
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
	errorAlert: {
		marginTop: "1rem",
		fontSize: "0.875rem",
	},
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
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		getTelemetry().stepViewed("tessera_upload");
	}, []);

	const handleFileChange = useCallback(
		async (files: FileList | null) => {
			if (!files || files.length === 0) return;

			setErrorMessage(null);

			const filesArray = Array.from(files);

			if (
				isTesseraFileLimitExceeded(currentTesserae.length, filesArray.length)
			) {
				const errorMsg = getFileCountErrorMessage();
				const error = new Error(errorMsg);
				getTelemetry().errorTracked("tessera_processing", error, {
					fileCount: filesArray.length,
					currentTesseraeCount: currentTesserae.length,
				});
				setErrorMessage(errorMsg);
				return;
			}

			const currentFiles = currentTesserae
				.map((t) => t.file)
				.filter((file): file is File => file !== undefined);
			if (isTotalRetainedSizeExceeded(currentFiles, filesArray)) {
				const errorMsg = getTotalSizeErrorMessage();
				const error = new Error(errorMsg);
				getTelemetry().errorTracked("tessera_processing", error, {
					fileCount: filesArray.length,
					totalFileSize: filesArray.reduce((sum, file) => sum + file.size, 0),
				});
				setErrorMessage(errorMsg);
				return;
			}

			for (const file of filesArray) {
				if (isFileSizeExceeded(file)) {
					const errorMsg = getFileSizeErrorMessage(file.name);
					const error = new Error(errorMsg);
					getTelemetry().errorTracked("tessera_processing", error, {
						fileName: file.name,
						fileSize: file.size,
					});
					setErrorMessage(errorMsg);
					return;
				}
			}

			const dimensionRejected: TesseraInfo[] = [];
			const validProcessingFiles: File[] = [];

			for (const file of filesArray) {
				let dims: { width: number; height: number };
				try {
					dims = await getImageDimensions(file);
				} catch {
					validProcessingFiles.push(file);
					continue;
				}

				if (isDimensionLimitExceeded(dims.width, dims.height)) {
					const errorMsg = getDimensionErrorMessage(dims.width, dims.height);
					const error = new Error(errorMsg);
					getTelemetry().errorTracked("tessera_dimension_limit", error, {
						fileName: file.name,
						width: dims.width,
						height: dims.height,
					});
					dimensionRejected.push({
						file,
						fileName: file.name,
						isValid: false,
						error: errorMsg,
						isLowResolution: false,
						previewUrl: null,
					});
				} else {
					validProcessingFiles.push(file);
				}
			}

			setIsProcessing(true);
			try {
				let tesserae = dimensionRejected;
				if (validProcessingFiles.length > 0) {
					const processed = await processTesserae(
						validProcessingFiles,
						adjustedTesseraSize,
					);
					tesserae = [...processed, ...dimensionRejected];
				}
				onTesseraeProcessed(tesserae);
				vibrate(15);
			} catch (error) {
				console.error("Error processing tesserae:", error);
				getTelemetry().errorTracked("tessera_processing", error, {
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

			{errorMessage && (
				<article {...stylex.props(base.card, styles.errorAlert)} role="alert">
					{errorMessage}
				</article>
			)}

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
