import type React from "react";
import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
	calculateAdjustedTesseraSize,
	calculateGridCellCount,
	isCoarseGrid,
} from "../engine/tessera-sizing";
import type { WorkflowState } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { trackEvent, trackStepView } from "../telemetry";

/** Props for {@link TesseraSizeSelection}. */
interface TesseraSizeSelectionProps {
	/** Called when the tessera size changes. */
	onSizeSelected: (size: number) => void;
	/** Current workflow state, used for source image dimensions. */
	initialState: WorkflowState;
}

/**
 * Lets the user pick a tessera pixel size and shows the adjusted size,
 * grid cell count, and any coarse-grid warning.
 */
export function TesseraSizeSelection({
	onSizeSelected,
	initialState,
}: TesseraSizeSelectionProps) {
	const [requestedSize, setRequestedSize] = useState<number>(
		initialState.requestedTesseraSize ?? 16,
	);
	const [adjustedSize, setAdjustedSize] = useState<number | null>(null);
	const [gridCellCount, setGridCellCount] = useState<number | null>(null);

	const isCoarse = gridCellCount !== null && isCoarseGrid(gridCellCount);

	const maxTesseraSize = 250;
	// initialState.sourceImage && initialState.hasValidSourceDimensions
	// 	? Math.min(
	// 			initialState.sourceImage.width,
	// 			initialState.sourceImage.height,
	// 		)
	// 	: 100;

	const onSizeSelectedRef = useRef(onSizeSelected);
	onSizeSelectedRef.current = onSizeSelected;

	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		trackStepView("build_tesserae");
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
	useEffect(() => {
		onSizeSelectedRef.current(requestedSize);
	}, []);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (initialState.sourceImage && initialState.hasValidSourceDimensions) {
			const adjusted = calculateAdjustedTesseraSize(
				requestedSize,
				initialState.sourceImage.width,
				initialState.sourceImage.height,
			);

			setAdjustedSize(adjusted);

			if (adjusted !== null) {
				const cellCount = calculateGridCellCount(
					adjusted,
					initialState.sourceImage.width,
					initialState.sourceImage.height,
				);

				setGridCellCount(cellCount);
			} else {
				setGridCellCount(null);
			}
		}
	}, [
		requestedSize,
		initialState.sourceImage,
		initialState.hasValidSourceDimensions,
	]);

	const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newSize = Number(e.target.value);
		setRequestedSize(newSize);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			onSizeSelectedRef.current(newSize);
			trackEvent("tessera_size_changed", { size: newSize });
			debounceTimerRef.current = null;
		}, 150);
	};

	const warningProps = stylex.props(base.card);

	return (
		<div>
			<div>
				<label htmlFor="tessera-size" {...stylex.props(base.label)}>
					Tile size (pixels):
				</label>
				<input
					id="tessera-size"
					type="range"
					min="2"
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
