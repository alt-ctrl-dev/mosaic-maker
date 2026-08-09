import type React from "react";
import { useState, useEffect } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import {
	calculateAdjustedTesseraSize,
	isCoarseGrid,
	calculateGridCellCount,
} from "../engine/tessera-sizing";

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
	const [requestedSize, setRequestedSize] = useState<number>(16);
	const [adjustedSize, setAdjustedSize] = useState<number | null>(null);
	const [gridCellCount, setGridCellCount] = useState<number | null>(null);

	const isCoarse = gridCellCount !== null && isCoarseGrid(gridCellCount);

	const maxTesseraSize =
		initialState.sourceImage && initialState.hasValidSourceDimensions
			? Math.min(
					initialState.sourceImage.width,
					initialState.sourceImage.height,
				)
			: 100;

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
		onSizeSelected(newSize);
	};

	return (
		<div className="tessera-size-selection">
			<div className="size-input">
				<label htmlFor="tessera-size">Tessera size (pixels):</label>
				<input
					id="tessera-size"
					type="range"
					min="2"
					max={maxTesseraSize}
					value={requestedSize}
					onChange={handleSizeChange}
				/>
				<span>{requestedSize}px</span>
			</div>

			{adjustedSize !== null && (
				<div className="size-adjustment-info">
					<p>
						Adjusted size: <strong>{adjustedSize}px</strong>
					</p>
					{requestedSize !== adjustedSize && (
						<p className="adjustment-explanation">
							Adjusted to fit within the valid tessera size range.
						</p>
					)}
				</div>
			)}

			{isCoarse && (
				<article className="warning-message" role="alert">
					Warning: This size produces only {gridCellCount} grid cells, which is
					fewer than recommended.
				</article>
			)}
		</div>
	);
}
