import { useState } from "react";
import type { ExportFormat } from "../engine/export";
import { exportMosaic } from "../engine/export";
import type { WorkflowState, ExportSettings } from "../engine/workflow-state";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";

/** Props for {@link ExportMosaic}. */
interface ExportMosaicProps {
	/** Current workflow state, used for mosaic result and export settings. */
	state: WorkflowState;
	/** Dispatches workflow actions for export settings changes. */
	dispatch: (action: WorkflowAction) => void;
}

const EXPORT_FORMATS: ReadonlyArray<ExportFormat> = ["png", "jpeg", "webp"];

function isExportFormat(value: string): value is ExportFormat {
	return EXPORT_FORMATS.includes(value as ExportFormat);
}

/** Detect iOS or iPadOS browsers that cannot reliably handle anchor downloads. */
function isIOSOrIPadOS(): boolean {
	if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
		return true;
	}
	// iPadOS 13+ reports as desktop Mac but has multi-touch
	return navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent);
}

/**
 * Trigger a file download by creating and clicking a temporary anchor element.
 */
function downloadFile(dataUrl: string, filename: string): void {
	const link = document.createElement("a");
	link.href = dataUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

/**
 * Convert a data URL to a Blob.
 *
 * @param dataUrl - The data URL to convert (must include a valid base64 payload)
 * @returns A Blob representation of the data
 */
function dataUrlToBlob(dataUrl: string): Blob {
	const [header, base64Data] = dataUrl.split(",");
	const mimeType = header.split(":")[1].split(";")[0];
	const byteString = atob(base64Data);
	const buffer = new ArrayBuffer(byteString.length);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < byteString.length; i++) {
		bytes[i] = byteString.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType });
}

/**
 * Open the exported image in a new tab.
 * For iOS devices, converts data URL to Blob URL to avoid blank tab issue.
 *
 * @returns An object with `opened` indicating whether the tab opened, and an
 *   optional `error` string if blob conversion failed.
 */
function openImageInNewTab(dataUrl: string): {
	opened: boolean;
	error?: string;
} {
	let urlToOpen = dataUrl;
	let blobUrl: string | null = null;

	if (isIOSOrIPadOS()) {
		try {
			const blob = dataUrlToBlob(dataUrl);
			blobUrl = URL.createObjectURL(blob);
			urlToOpen = blobUrl;
		} catch (_error) {
			return {
				opened: false,
				error:
					"Could not prepare image for iOS. Please try a different browser.",
			};
		}
	}

	const newWindow = window.open(urlToOpen, "_blank");

	if (blobUrl) {
		setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
	}

	return { opened: newWindow !== null };
}

/**
 * Detect whether the browser can reliably handle programmatic anchor
 * downloads. iOS Safari and WebKit-based browsers frequently fail.
 */
function browserSupportsAnchorDownload(): boolean {
	return !isIOSOrIPadOS();
}

/**
 * Export step that lets the user configure format, quality, and alt text,
 * preview the mosaic, and trigger a file download.
 */
export function ExportMosaic({ state, dispatch }: ExportMosaicProps) {
	const [isExporting, setIsExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const handleExportSettingsChange = (settings: Partial<ExportSettings>) => {
		dispatch({ type: "exportSettingsChanged", settings });
	};

	const handleDownload = async () => {
		if (!state.mosaicResult) {
			setError("No mosaic to export");
			return;
		}

		setIsExporting(true);
		setError(null);

		try {
			const exportedDataUrl = await exportMosaic(
				state.mosaicResult.dataUrl,
				state.mosaicResult.width,
				state.mosaicResult.height,
				state.exportFormat,
				state.exportQuality,
			);

			if (browserSupportsAnchorDownload()) {
				downloadFile(exportedDataUrl, `mosaic.${state.exportFormat}`);
			} else {
				const { opened, error: openError } = openImageInNewTab(exportedDataUrl);
				if (openError) {
					setError(openError);
				} else if (!opened) {
					setError(
						'Popup blocked. To save the image, please tap the share button and choose "Save Image".',
					);
				}
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="export-mosaic-step">
			{state.mosaicResult ? (
				<>
					<div className="export-preview">
						<h3>Preview</h3>
						<img
							src={state.mosaicResult.dataUrl}
							alt={"Generated mosaic"}
							className="mosaic-preview"
						/>
					</div>
					<details>
						<summary className="outline secondary">Export Settings</summary>
						<div className="export-settings">
							<fieldset className="setting-group">
								<legend>Format Settings</legend>
								<div className="input-group">
									<label htmlFor="export-format">Format:</label>
									<select
										id="export-format"
										value={state.exportFormat}
										onChange={(e) => {
											const value = e.target.value;
											if (isExportFormat(value)) {
												handleExportSettingsChange({ exportFormat: value });
											}
										}}
										disabled={isExporting}
									>
										<option value="png">PNG</option>
										<option value="jpeg">JPEG</option>
										<option value="webp">WebP</option>
									</select>
								</div>
							</fieldset>

							{(state.exportFormat === "jpeg" ||
								state.exportFormat === "webp") && (
								<fieldset className="setting-group">
									<legend>Quality Settings</legend>
									<div className="input-group">
										<label htmlFor="export-quality">
											Quality: {Math.round(state.exportQuality * 100)}%
										</label>
										<input
											id="export-quality"
											type="range"
											min="0"
											max="1"
											step="0.01"
											value={state.exportQuality}
											onChange={(e) =>
												handleExportSettingsChange({
													exportQuality: parseFloat(e.target.value),
												})
											}
											disabled={isExporting}
										/>
									</div>
								</fieldset>
							)}

							{state.exportFormat === "jpeg" && (
								<fieldset className="setting-group">
									<legend>Background Settings</legend>
									<div className="input-group">
										<label htmlFor="export-background">Background Color:</label>
										<input
											id="export-background"
											type="color"
											value={state.exportBackgroundColor}
											onChange={(e) =>
												handleExportSettingsChange({
													exportBackgroundColor: e.target.value,
												})
											}
											disabled={isExporting}
										/>
									</div>
								</fieldset>
							)}
						</div>
					</details>

					<div className="export-actions">
						<button
							type="button"
							onClick={handleDownload}
							disabled={isExporting}
							aria-busy={isExporting}
							className="primary"
						>
							{isExporting ? "Exporting..." : "Download"}
						</button>

						{error && (
							<article className="error-message" role="alert">
								<strong>Error:</strong> {error}
							</article>
						)}
					</div>
				</>
			) : (
				<div className="no-mosaic">
					<p>
						No mosaic has been generated yet. Please go back to the previous
						step to generate a mosaic.
					</p>
				</div>
			)}
		</div>
	);
}
