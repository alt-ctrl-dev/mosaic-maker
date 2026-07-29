import type React from "react";
import { useState, useEffect } from "react";
import type { WorkflowState } from "../engine/workflow-state";
import {
	calculateAdjustedTesseraSize,
	isCoarseGrid,
	calculateGridCellCount,
} from "../engine/tessera-sizing";

interface TesseraSizeSelectionProps {
	onSizeSelected: (size: number) => void;
	initialState: WorkflowState;
}

export function TesseraSizeSelection({
	onSizeSelected,
	initialState,
}: TesseraSizeSelectionProps) {
	const [requestedSize, setRequestedSize] = useState<number>(16);
	const [adjustedSize, setAdjustedSize] = useState<number | null>(null);
	const [isCoarse, setIsCoarse] = useState(false);
	const [gridCellCount, setGridCellCount] = useState<number | null>(null);

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
				setIsCoarse(isCoarseGrid(cellCount));
			}
		}
	}, [
		requestedSize,
		initialState.sourceImage,
		initialState.hasValidSourceDimensions,
	]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (adjustedSize !== null) {
			onSizeSelected(requestedSize);
		}
	};

	return (
		<div className="tessera-size-selection">
			<form onSubmit={handleSubmit}>
				<div className="size-input">
					<label htmlFor="tessera-size">Tessera size (pixels):</label>
					<input
						id="tessera-size"
						type="number"
						min="8"
						value={requestedSize}
						onChange={(e) => setRequestedSize(Number(e.target.value))}
						aria-describedby="size-explanation"
					/>
				</div>

				{adjustedSize !== null && (
					<div className="size-adjustment-info">
						<p>
							Adjusted size: <strong>{adjustedSize}px</strong>
						</p>
						{requestedSize !== adjustedSize && (
							<p className="adjustment-explanation">
								Adjusted to the nearest valid size that divides both source
								dimensions.
							</p>
						)}
					</div>
				)}

				{isCoarse && gridCellCount !== null && (
					<div className="warning-message" role="alert">
						Warning: This size produces only {gridCellCount} grid cells, which
						is fewer than recommended.
					</div>
				)}

				<button type="submit" disabled={adjustedSize === null}>
					Confirm Size
				</button>
			</form>
		</div>
	);
}
