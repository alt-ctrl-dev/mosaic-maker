import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	commitTesseraSizeAtom,
	hasValidSourceDimensionsAtom,
	requestedTesseraSizeAtom,
	sourceImageAtom,
} from "../atoms/workflow-atoms";
import {
	MAX_TESSERA_SIZE,
	MIN_TESSERA_SIZE,
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	isCoarseGrid,
} from "../engine/tessera-sizing";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackEvent, trackStepView } from "../telemetry";

const styles = stylex.create({
	// The source image under its live construction grid: dragging the size
	// re-solves the grid density against the real image dimensions.
	gridPreview: {
		position: "relative",
		maxWidth: "20rem",
		marginTop: "1rem",
		marginInline: "auto",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	gridPreviewImage: { display: "block", width: "100%" },
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
	const initialRequestedSize = useAtomValue(requestedTesseraSizeAtom);
	const commitTesseraSize = useSetAtom(commitTesseraSizeAtom);
	const [requestedSize, setRequestedSize] = useState<number>(
		() => initialRequestedSize ?? 16,
	);

	// Derived synchronously (not in an effect): a one-render-lag copy of the
	// adjusted size flashed the "adjusted to fit" note while dragging.
	const adjustedSize =
		sourceImage && hasValidSourceDimensions
			? calculateAdjustedTesseraSize(
					requestedSize,
					sourceImage.width,
					sourceImage.height,
				)
			: null;

	const gridCellCount =
		adjustedSize !== null && sourceImage
			? calculateGridCellCount(
					adjustedSize,
					sourceImage.width,
					sourceImage.height,
				)
			: null;

	const isCoarse = gridCellCount !== null && isCoarseGrid(gridCellCount);

	// The ceiling is engine truth: no tessera larger than the source's
	// short side, and never larger than the product max. 100 covers the
	// no-image-yet case.
	const maxTesseraSize =
		sourceImage && hasValidSourceDimensions
			? Math.min(MAX_TESSERA_SIZE, sourceImage.width, sourceImage.height)
			: 100;

	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		trackStepView("build_tesserae");
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
	useEffect(() => {
		commitTesseraSize(requestedSize);
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
			commitTesseraSize(newSize);
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

	return (
		<div>
			<div>
				<label htmlFor="tessera-size" {...stylex.props(base.label)}>
					Tile size (pixels):
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
				<span>{requestedSize}px</span>
			</div>

			{adjustedSize !== null && (
				<div>
					<p {...stylex.props(base.paragraph)}>
						Adjusted size: <strong>{adjustedSize}px</strong>
					</p>
					{requestedSize !== adjustedSize && (
						<p {...stylex.props(base.paragraph)}>
							Adjusted to fit within the valid tile size range.
						</p>
					)}
				</div>
			)}

			{showGridPreview && sourceImage && (
				<div>
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
								backgroundSize: `${gridCellWidthPct}% ${gridCellHeightPct}%`,
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
