import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useEffect, useRef } from "react";
import {
	adjustedTesseraSizeAtom,
	commitTesseraSizeAtom,
	gridCellCountAtom,
	hasValidSourceDimensionsAtom,
	isCoarseGridAtom,
	requestedTesseraSizeAtom,
	sourceImageAtom,
} from "../atoms/workflow-atoms";
import { MAX_TESSERA_SIZE, MIN_TESSERA_SIZE } from "../engine/tessera-sizing";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackEvent, trackStepView } from "../telemetry";

// The CSS caps mirror these constants; the fit math below predicts the
// on-screen preview size from them.
const PREVIEW_MAX_WIDTH_REM = 20;
const PREVIEW_MAX_HEIGHT_REM = 25;
// Below this on-screen cell spacing the 1px grid lines merge into a solid
// fill, so the overlay draws every Nth line to stay legible.
const MIN_GRID_CELL_REM = 3 / 16;

const styles = stylex.create({
	// The source image under its live construction grid: dragging the size
	// re-solves the grid density against the real image dimensions. The
	// container shrink-wraps the capped image so the overlay stays aligned.
	gridPreviewWrap: { textAlign: "center" },
	gridPreview: {
		display: "inline-block",
		position: "relative",
		marginTop: "1rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	gridPreviewImage: {
		display: "block",
		maxWidth: `${PREVIEW_MAX_WIDTH_REM}rem`,
		maxHeight: `${PREVIEW_MAX_HEIGHT_REM}rem`,
	},
	gridOverlay: {
		position: "absolute",
		inset: 0,
		pointerEvents: "none",
	},
	gridReadout: {
		marginTop: "0.5rem",
		textAlign: "center",
		fontFamily: "ui-monospace, monospace",
		fontSize: "0.8rem",
		color: tokens.info,
		fontVariantNumeric: "tabular-nums",
	},
});

/**
 * Lets the user pick a tessera pixel size and shows the adjusted size,
 * grid cell count, and any coarse-grid warning.
 */
export function TesseraSizeSelection() {
	const sourceImage = useAtomValue(sourceImageAtom);
	const hasValidSourceDimensions = useAtomValue(hasValidSourceDimensionsAtom);
	// The slider is bound straight to the atom: the derived adjusted size and
	// grid metrics follow live, and only the commit (clearing existing tiles)
	// is debounced.
	const [requestedSize, setRequestedSize] = useAtom(requestedTesseraSizeAtom);
	const adjustedSize = useAtomValue(adjustedTesseraSizeAtom);
	const gridCellCount = useAtomValue(gridCellCountAtom);
	const isCoarse = useAtomValue(isCoarseGridAtom);
	const commitTesseraSize = useSetAtom(commitTesseraSizeAtom);

	// The ceiling is engine truth: no tessera larger than the source's
	// short side, and never larger than the product max. 100 covers the
	// no-image-yet case.
	const maxTesseraSize =
		sourceImage && hasValidSourceDimensions
			? Math.min(MAX_TESSERA_SIZE, sourceImage.width, sourceImage.height)
			: 100;

	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	// Committing clears existing tiles; skip commits that land on the size
	// already in effect (e.g. dragging the slider away and back).
	const lastCommittedSizeRef = useRef(requestedSize);

	useEffect(() => {
		trackStepView("pick_tile_size");
	}, []);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newSize = Number(e.target.value);
		setRequestedSize(newSize);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			if (newSize !== lastCommittedSizeRef.current) {
				commitTesseraSize(newSize);
				lastCommittedSizeRef.current = newSize;
			}
			trackEvent("tessera_size_changed", { size: newSize });
			debounceTimerRef.current = null;
		}, 150);
	};

	const warningProps = stylex.props(base.card);

	const showGridPreview =
		sourceImage !== null && hasValidSourceDimensions && adjustedSize !== null;
	const gridColumns =
		showGridPreview && sourceImage
			? Math.ceil(sourceImage.width / adjustedSize)
			: null;
	const gridRows =
		showGridPreview && sourceImage
			? Math.ceil(sourceImage.height / adjustedSize)
			: null;
	const gridCellWidthPct =
		showGridPreview && sourceImage
			? (adjustedSize / sourceImage.width) * 100
			: null;
	const gridCellHeightPct =
		showGridPreview && sourceImage
			? (adjustedSize / sourceImage.height) * 100
			: null;

	// Fitted preview width (mirrors the CSS caps). When cells crowd below
	// MIN_GRID_CELL_REM on screen, the overlay draws every Nth line so the
	// grid stays visible at every tile size instead of fusing into a solid
	// fill.
	const previewWidthRem =
		showGridPreview && sourceImage
			? Math.min(
					PREVIEW_MAX_WIDTH_REM,
					PREVIEW_MAX_HEIGHT_REM * (sourceImage.width / sourceImage.height),
				)
			: null;
	const gridCellRem =
		showGridPreview && previewWidthRem !== null && sourceImage !== null
			? (previewWidthRem * adjustedSize) / sourceImage.width
			: null;
	const gridStride =
		gridCellRem !== null && gridCellRem > 0
			? Math.max(1, Math.ceil(MIN_GRID_CELL_REM / gridCellRem))
			: 1;

	return (
		<div>
			<div>
				<label htmlFor="tessera-size" {...stylex.props(base.label)}>
					Tile size ({requestedSize} pixels x {requestedSize} pixels):
				</label>
				<input
					id="tessera-size"
					type="range"
					min={MIN_TESSERA_SIZE}
					max={maxTesseraSize}
					value={requestedSize}
					onChange={handleSizeChange}
					{...stylex.props(base.rangeInput, base.focusOutline)}
				/>
			</div>

			{showGridPreview && sourceImage && (
				<div {...stylex.props(styles.gridPreviewWrap)}>
					<div {...stylex.props(styles.gridPreview)}>
						<img
							src={sourceImage.url}
							alt="Source under the construction grid at the selected tile size"
							{...stylex.props(styles.gridPreviewImage)}
						/>
						<div
							{...stylex.props(styles.gridOverlay)}
							aria-hidden="true"
							style={{
								backgroundImage:
									"linear-gradient(to right, rgba(10, 12, 18, 0.85) 1px, transparent 1px), linear-gradient(to bottom, rgba(10, 12, 18, 0.85) 1px, transparent 1px)",
								backgroundSize: `${(gridCellWidthPct ?? 0) * gridStride}% ${(gridCellHeightPct ?? 0) * gridStride}%`,
							}}
						/>
					</div>
					<p {...stylex.props(styles.gridReadout)}>
						{gridColumns} × {gridRows} cells · {gridCellCount} total
					</p>
				</div>
			)}

			{isCoarse && (
				<article
					{...warningProps}
					className={`warning-message ${warningProps.className}`}
					role="alert"
				>
					Warning: This size produces only {gridCellCount} grid cells, which is
					fewer than recommended.
				</article>
			)}
		</div>
	);
}
