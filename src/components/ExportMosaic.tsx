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

			const link = document.createElement("a");
			link.href = exportedDataUrl;
			link.download = `mosaic.${state.exportFormat}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
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
					<div className="export-settings">
						<div className="setting-group">
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

						{(state.exportFormat === "jpeg" ||
							state.exportFormat === "webp") && (
							<div className="setting-group">
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
						)}

						{state.exportFormat === "jpeg" && (
							<div className="setting-group">
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
						)}

						<div className="setting-group">
							<label htmlFor="export-alt-text">
								Alt Text (for preview only):
							</label>
							<textarea
								id="export-alt-text"
								value={state.exportAltText}
								onChange={(e) =>
									handleExportSettingsChange({ exportAltText: e.target.value })
								}
								placeholder="Describe the mosaic for accessibility..."
								rows={3}
								disabled={isExporting}
							/>
							<p className="hint">
								Note: Downloaded image files do not carry alt text. Add
								equivalent text when publishing them.
							</p>
						</div>
					</div>

					<div className="export-preview">
						<h3>Preview</h3>
						<img
							src={state.mosaicResult.dataUrl}
							alt={state.exportAltText || "Generated mosaic"}
							className="mosaic-preview"
							style={{
								maxWidth: "100%",
								maxHeight: "400px",
								width: "auto",
								height: "auto",
							}}
						/>
					</div>

					<div className="export-actions">
						<button
							type="button"
							onClick={handleDownload}
							disabled={isExporting}
							aria-busy={isExporting}
						>
							{isExporting ? "Exporting..." : "Download"}
						</button>

						{error && (
							<div className="error-message" role="alert">
								<strong>Error:</strong> {error}
							</div>
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
