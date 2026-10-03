import { useState } from "react";
import type { ExportFormat } from "../engine/export";
import { exportMosaic } from "../engine/export";
import type { WorkflowState, ExportSettings } from "../engine/workflow-state";
import type { WorkflowAction } from "../hooks/useWorkflowReducer";
import { trackEvent } from "../telemetry";

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

/** Check if the Web Share API surface is present in the browser. */
function supportsWebShare(): boolean {
	return !!navigator.share && !!navigator.canShare;
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
 * Open a blank tab immediately within the user gesture so the browser does
 * not treat it as a popup, then return a callback to populate the tab with
 * the mosaic image after the async export completes. Only used on iOS/iPadOS
 * where programmatic anchor downloads are unreliable.
 *
 * @returns An object with `populate` (a callback to fill the tab with the
 *   exported image) and an optional `error` if the popup was blocked.
 */
function openNewTabForLaterPopulation(): {
	populate: (dataUrl: string) => void;
	error?: string;
} {
	const newWindow = window.open("", "_blank");

	if (!newWindow) {
		return {
			populate: () => {},
			error:
				'Popup blocked. To save the image, please tap the share button and choose "Save Image".',
		};
	}

	const populate = (dataUrl: string) => {
		let blobUrl: string | null = null;
		try {
			const blob = dataUrlToBlob(dataUrl);
			blobUrl = URL.createObjectURL(blob);

			// Sever the opener reference so the populated tab cannot navigate or
			// inspect the originating app window (reverse tabnabbing).
			try {
				newWindow.opener = null;
			} catch {
				// Some browsers make `opener` read-only; ignore if assignment fails.
			}

			// Build the document with DOM APIs rather than document.write with an
			// interpolated HTML string. The blob URL never flows through HTML or
			// script text, so there is no injection surface even though the blob
			// URL itself is same-origin and not user-controlled.
			const doc = newWindow.document;
			doc.title = "Exported Mosaic";

			const viewport = doc.createElement("meta");
			viewport.name = "viewport";
			viewport.content = "width=device-width, initial-scale=1";
			doc.head.appendChild(viewport);

			const { body } = doc;
			body.style.margin = "0";
			body.style.padding = "20px";
			body.style.display = "flex";
			body.style.justifyContent = "center";
			body.style.alignItems = "center";
			body.style.minHeight = "100vh";
			body.style.background = "#f0f0f0";

			const img = doc.createElement("img");
			img.alt = "Exported mosaic";
			img.style.maxWidth = "100%";
			img.style.maxHeight = "100vh";
			img.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";

			// Revoke the blob URL once the image has rendered (or failed) instead of
			// guessing a fixed delay, so the object URL lives exactly as long as it
			// is needed and is not leaked for the lifetime of the tab.
			const revoke = () => {
				if (blobUrl) {
					URL.revokeObjectURL(blobUrl);
					blobUrl = null;
				}
			};
			img.addEventListener("load", revoke);
			img.addEventListener("error", revoke);
			img.src = blobUrl;
			body.appendChild(img);

			newWindow.focus();
		} catch (_error) {
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
			newWindow.close();
			throw new Error(
				"Could not prepare image for iOS. Please try a different browser.",
			);
		}
	};

	return { populate };
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

	const handleShare = async () => {
		if (!state.mosaicResult) {
			setError("No mosaic to share");
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

			const blob = dataUrlToBlob(exportedDataUrl);
			const file = new File([blob], `mosaic.${state.exportFormat}`, {
				type: blob.type,
			});

			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({
					files: [file],
					title: "Mosaic Image",
					text: "Check out this mosaic I created!",
				});

				trackEvent("mosaic_download", {
					format: state.exportFormat,
					quality: state.exportQuality,
					width: state.mosaicResult.width,
					height: state.mosaicResult.height,
					delivery: "share",
				});
			} else {
				throw new Error("Your browser cannot share this type of file.");
			}
		} catch (err) {
			// User cancelling the native share sheet is not an error.
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}

			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
		} finally {
			setIsExporting(false);
		}
	};

	const handleDownload = async () => {
		if (!state.mosaicResult) {
			setError("No mosaic to export");
			return;
		}

		setIsExporting(true);
		setError(null);

		const useAnchorDownload = browserSupportsAnchorDownload();
		let tabPopulator: ((dataUrl: string) => void) | null = null;
		let deliveryMethod: "anchor" | "new-tab-populated" = "anchor";

		if (!useAnchorDownload) {
			const { populate, error } = openNewTabForLaterPopulation();
			if (error) {
				setError(error);
				setIsExporting(false);
				return;
			}

			tabPopulator = populate;
			deliveryMethod = "new-tab-populated";
		}

		try {
			const exportedDataUrl = await exportMosaic(
				state.mosaicResult.dataUrl,
				state.mosaicResult.width,
				state.mosaicResult.height,
				state.exportFormat,
				state.exportQuality,
			);

			if (useAnchorDownload) {
				downloadFile(exportedDataUrl, `mosaic.${state.exportFormat}`);
			} else if (tabPopulator) {
				tabPopulator(exportedDataUrl);
			}

			trackEvent("mosaic_download", {
				format: state.exportFormat,
				quality: state.exportQuality,
				width: state.mosaicResult.width,
				height: state.mosaicResult.height,
				delivery: deliveryMethod,
			});
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
						<div className="button-group">
							<button
								type="button"
								onClick={handleDownload}
								disabled={isExporting}
								aria-busy={isExporting}
								className="secondary"
							>
								{isExporting ? "Exporting..." : "Download"}
							</button>

							{supportsWebShare() && (
								<button
									type="button"
									onClick={handleShare}
									disabled={isExporting}
									aria-busy={isExporting}
									className="primary"
								>
									{isExporting ? "Sharing..." : "Share"}
								</button>
							)}
						</div>

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
