import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import {
	exportErrorAtom,
	isExportingAtom,
	isGeneratingMosaicAtom,
} from "../atoms/ui-atoms";
import {
	exportBackgroundColorAtom,
	exportFormatAtom,
	exportQualityAtom,
	mosaicResultAtom,
} from "../atoms/workflow-atoms";
import type { ExportFormat } from "../engine/export";
import { exportMosaic } from "../engine/export";
import type { MosaicResult } from "../engine/mosaic-engine";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackError, trackEvent } from "../telemetry";
import { ActionButton } from "./ActionButton";

const styles = stylex.create({
	settingGroup: { marginBottom: "1.5rem" },
	settingLegend: { fontWeight: "bold", marginBottom: "0.5rem" },
	inputGroup: { marginBottom: "1rem" },
	inputGroupLabel: { display: "block", marginBottom: "0.5rem" },
	exportPreview: { margin: "1rem 0", textAlign: "center" },
	// The old stylesheet gave details content a 1rem margin on every side.
	detailsContent: { margin: "1rem" },
	summary: {
		textAlign: "center",
		marginBottom: "1rem",
		fontSize: "0.875rem",
		color: tokens.secondary,
	},
	confirmation: {
		textAlign: "center",
		marginTop: "1rem",
		fontSize: "0.875rem",
		color: tokens.valid,
	},
	mosaicPreview: {
		maxWidth: "100%",
		maxHeight: "70vh",
		width: "auto",
		height: "auto",
		borderRadius: tokens.radius,
		boxShadow: tokens.shadow,
	},
});

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
				"Popup blocked. To save the image, please tap the Download button again.",
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
			body.style.padding = "1.25rem";
			body.style.display = "flex";
			body.style.justifyContent = "center";
			body.style.alignItems = "center";
			body.style.minHeight = "100vh";
			body.style.background = "#f0f0f0";

			const img = doc.createElement("img");
			img.alt = "Exported mosaic";
			img.style.maxWidth = "100%";
			img.style.maxHeight = "100vh";
			img.style.boxShadow = "0 0.125rem 0.625rem rgba(0,0,0,0.1)";

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
 * Compute the label for the primary export button based on the current
 * exporting state and whether the Web Share API is available.
 */
function exportButtonLabel(isExporting: boolean, canShare: boolean): string {
	if (isExporting) {
		return canShare ? "Sharing..." : "Exporting...";
	}
	return canShare ? "Share" : "Download";
}

/**
 * Mosaic preview plus export settings and delivery. Shown on the
 * generate step once a mosaic is ready.
 */
export function ExportPanel() {
	const mosaicResult = useAtomValue(mosaicResultAtom);
	const [exportFormat, setExportFormat] = useAtom(exportFormatAtom);
	const [exportQuality, setExportQuality] = useAtom(exportQualityAtom);
	const [exportBackgroundColor, setExportBackgroundColor] = useAtom(
		exportBackgroundColorAtom,
	);
	const [isExporting, setIsExporting] = useAtom(isExportingAtom);

	const [error, setError] = useAtom(exportErrorAtom);
	const [isDelivered, setIsDelivered] = useState(false);
	// Export controls stay hidden while a (re)generation is in flight.
	const isGenerating = useAtomValue(isGeneratingMosaicAtom);
	const canShare = supportsWebShare();

	/**
	 * Share the mosaic via the Web Share API. Returns `false` when the browser
	 * reports it cannot share the generated file, letting the caller fall back
	 * to a download. Lets {@link navigator.share} rejections (network failures,
	 * API errors, user-aborted share sheet) propagate to the caller.
	 */
	const shareExportedMosaic = async (
		exportedDataUrl: string,
		mosaicResult: MosaicResult,
	): Promise<boolean> => {
		const blob = dataUrlToBlob(exportedDataUrl);
		const file = new File([blob], `mosaic.${exportFormat}`, {
			type: blob.type,
		});

		if (!navigator.canShare?.({ files: [file] })) {
			return false;
		}

		await navigator.share({
			files: [file],
			title: "Mosaic Image",
			text: "Check out this mosaic I created!",
		});

		trackEvent("mosaic_download", {
			format: exportFormat,
			quality: exportQuality,
			width: mosaicResult.width,
			height: mosaicResult.height,
			delivery: "share",
		});

		return true;
	};

	/**
	 * Deliver an already-exported mosaic to the device, using a direct anchor
	 * download where supported and falling back to populating a tab that was
	 * pre-opened within the user gesture on iOS/iPadOS.
	 *
	 * @param exportedDataUrl - The already-exported mosaic data URL to deliver
	 * @param mosaicResult - The mosaic result, used for telemetry dimensions
	 * @param useAnchorDownload - Whether a direct anchor download is supported
	 * @param tabPopulator - Callback that fills the pre-opened tab with the
	 *   image, used when anchor downloads are unavailable
	 */
	const downloadExportedMosaic = (
		exportedDataUrl: string,
		mosaicResult: MosaicResult,
		useAnchorDownload: boolean,
		tabPopulator: ((dataUrl: string) => void) | null,
	): void => {
		if (useAnchorDownload) {
			downloadFile(exportedDataUrl, `mosaic.${exportFormat}`);
		} else if (tabPopulator) {
			tabPopulator(exportedDataUrl);
		}

		trackEvent("mosaic_download", {
			format: exportFormat,
			quality: exportQuality,
			width: mosaicResult.width,
			height: mosaicResult.height,
			delivery: useAnchorDownload ? "anchor" : "new-tab-populated",
		});
	};

	const handleExport = async () => {
		if (!mosaicResult) {
			setError("No mosaic to export");
			return;
		}

		setIsExporting(true);
		setError(null);
		setIsDelivered(false);

		// Prepare the download delivery path up front. On iOS/iPadOS a tab must be
		// opened synchronously within the user gesture, before the async export,
		// so the browser does not treat it as a blocked popup.
		const useAnchorDownload = browserSupportsAnchorDownload();
		let tabPopulator: ((dataUrl: string) => void) | null = null;
		if (!canShare && !useAnchorDownload) {
			const { populate, error } = openNewTabForLaterPopulation();
			if (error) {
				setError(error);
				setIsExporting(false);
				return;
			}
			tabPopulator = populate;
		}

		try {
			// Export exactly once per user action and reuse the result for both the
			// share and download delivery paths.
			const exportedDataUrl = await exportMosaic(
				mosaicResult.dataUrl,
				mosaicResult.width,
				mosaicResult.height,
				exportFormat,
				exportQuality,
			);

			if (canShare) {
				const shared = await shareExportedMosaic(exportedDataUrl, mosaicResult);
				if (shared) {
					setIsDelivered(true);
					return;
				}
				// Sharing failed (unsupported file type). Fall through to download
				// using the already-exported data URL to avoid re-exporting.
			}

			downloadExportedMosaic(
				exportedDataUrl,
				mosaicResult,
				useAnchorDownload,
				tabPopulator,
			);
			setIsDelivered(true);
		} catch (err) {
			// User cancelling the native share sheet is not an error.
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}

			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			trackError("mosaic_export", err, {
				exportFormat: exportFormat,
				exportQuality: exportQuality,
			});
		} finally {
			setIsExporting(false);
		}
	};

	const errorPanelProps = stylex.props(base.card);

	return (
		<div>
			{mosaicResult ? (
				<>
					<div {...stylex.props(styles.exportPreview)}>
						<h3 {...stylex.props(base.heading, base.h3)}>Preview</h3>
						<img
							src={mosaicResult.dataUrl}
							alt={"Generated mosaic"}
							{...stylex.props(styles.mosaicPreview)}
						/>
					</div>
					{isGenerating ? (
						<p {...stylex.props(base.paragraph, base.busySpinner)}>
							Generating mosaic...
						</p>
					) : (
						<>
							<div {...stylex.props(styles.summary)}>
								{exportFormat.toUpperCase()} · {mosaicResult.width}×
								{mosaicResult.height} · ~
								{Math.round((mosaicResult.dataUrl.length * 0.75) / 1024)} KB
							</div>
							<details
								{...stylex.props(base.details)}
								open={exportFormat === "jpeg" || exportFormat === "webp"}
							>
								<summary {...stylex.props(base.summary)}>
									Export Settings
								</summary>
								<div {...stylex.props(styles.detailsContent)}>
									<fieldset
										{...stylex.props(base.fieldset, styles.settingGroup)}
									>
										<legend
											{...stylex.props(base.legend, styles.settingLegend)}
										>
											Format Settings
										</legend>
										<div {...stylex.props(styles.inputGroup)}>
											<label
												htmlFor="export-format"
												{...stylex.props(base.label, styles.inputGroupLabel)}
											>
												Format:
											</label>
											<select
												id="export-format"
												value={exportFormat}
												onChange={(e) => {
													const value = e.target.value;
													if (isExportFormat(value)) {
														setExportFormat(value);
													}
												}}
												disabled={isExporting}
												{...stylex.props(base.field, base.focusOutline)}
											>
												<option value="png">PNG</option>
												<option value="jpeg">JPEG</option>
												<option value="webp">WebP</option>
											</select>
										</div>
									</fieldset>

									{(exportFormat === "jpeg" || exportFormat === "webp") && (
										<fieldset
											{...stylex.props(base.fieldset, styles.settingGroup)}
										>
											<legend
												{...stylex.props(base.legend, styles.settingLegend)}
											>
												Quality Settings
											</legend>
											<div {...stylex.props(styles.inputGroup)}>
												<label
													htmlFor="export-quality"
													{...stylex.props(base.label, styles.inputGroupLabel)}
												>
													Quality: {Math.round(exportQuality * 100)}%
												</label>
												<input
													id="export-quality"
													type="range"
													min="0"
													max="1"
													step="0.01"
													value={exportQuality}
													onChange={(e) =>
														setExportQuality(parseFloat(e.target.value))
													}
													disabled={isExporting}
													{...stylex.props(base.rangeInput, base.focusOutline)}
												/>
											</div>
										</fieldset>
									)}

									{exportFormat === "jpeg" && (
										<fieldset
											{...stylex.props(base.fieldset, styles.settingGroup)}
										>
											<legend
												{...stylex.props(base.legend, styles.settingLegend)}
											>
												Background Settings
											</legend>
											<div {...stylex.props(styles.inputGroup)}>
												<label
													htmlFor="export-background"
													{...stylex.props(base.label, styles.inputGroupLabel)}
												>
													Background Color:
												</label>
												<input
													id="export-background"
													type="color"
													value={exportBackgroundColor}
													onChange={(e) =>
														setExportBackgroundColor(e.target.value)
													}
													disabled={isExporting}
													{...stylex.props(base.colorInput, base.focusOutline)}
												/>
											</div>
										</fieldset>
									)}
								</div>
							</details>

							<div>
								<ActionButton
									type="button"
									onClick={handleExport}
									disabled={isExporting}
									aria-busy={isExporting}
								>
									{exportButtonLabel(isExporting, canShare)}
								</ActionButton>

								{isDelivered && (
									<div {...stylex.props(styles.confirmation)} role="status">
										Delivered!
									</div>
								)}

								{error && (
									<article
										{...errorPanelProps}
										className={`error-message ${errorPanelProps.className}`}
										role="alert"
									>
										<strong>Error:</strong> {error}
									</article>
								)}
							</div>
						</>
					)}
				</>
			) : (
				<div>
					<p {...stylex.props(base.paragraph)}>
						No mosaic has been generated yet. Please go back to the previous
						step to generate a mosaic.
					</p>
				</div>
			)}
		</div>
	);
}
