import { useState, useEffect } from "react";
import { generateNoiseTesseraeFromState } from "../engine/generate-noise-tesserae-helper";
import {
	SEED_MAX,
	type WorkflowState,
	type TesseraInfo,
	getVarietyRecommendation,
} from "../engine/workflow-state";
import { calculateGridCellCount } from "../engine/tessera-sizing";

/**
 * Compute the default tessera count for a given workflow state.
 * Returns the explicit count from state when set, the variety recommendation
 * when source image and tessera size are available, or 20 as a fallback.
 */
function computeDefaultTesseraCount(state: WorkflowState): number {
	if (state.generatedTesseraCount !== null) {
		return state.generatedTesseraCount;
	}
	if (state.sourceImage && state.adjustedTesseraSize) {
		const gridCellCount = calculateGridCellCount(
			state.adjustedTesseraSize,
			state.sourceImage.width,
			state.sourceImage.height,
		);
		return getVarietyRecommendation(gridCellCount);
	}
	return 20;
}

/** Props for {@link GeneratedTesserae}. */
interface GeneratedTesseraeProps {
	/** Called with the generated tesserae when generation completes. */
	onTesseraeGenerated: (tesserae: TesseraInfo[]) => void;
	/** Current workflow state, used for seed and count defaults. */
	initialState: WorkflowState;
}

/**
 * Controls for generating procedural noise-based tesserae.
 */
export function GeneratedTesserae({
	onTesseraeGenerated,
	initialState,
}: GeneratedTesseraeProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [seed, setSeed] = useState<number>(
		initialState.seed ?? Math.floor(Math.random() * SEED_MAX),
	);
	const [count, setCount] = useState<number>(
		computeDefaultTesseraCount(initialState),
	);

	useEffect(() => {
		if (initialState.seed !== null) {
			setSeed(initialState.seed);
		}
		setCount(computeDefaultTesseraCount(initialState));
	}, [initialState]);

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			const tempState = {
				...initialState,
				seed,
				generatedTesseraCount: count,
			};

			const tesserae = await generateNoiseTesseraeFromState(tempState);
			onTesseraeGenerated(tesserae);
		} catch (error) {
			console.error("Error generating tesserae:", error);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleNewSeed = () => {
		setSeed(Math.floor(Math.random() * SEED_MAX));
	};

	return (
		<div className="generated-tesserae" data-testid="generated-tesserae">
			<fieldset className="control-group">
				<legend>Generate random tiles</legend>
				<div className="seed-control">
					<label htmlFor="seed">Seed:</label>
					<div className="input-group">
						<input
							id="seed"
							type="number"
							value={seed}
							onChange={(e) => setSeed(Number(e.target.value))}
							aria-label="Seed value for generation"
						/>
						<button type="button" onClick={handleNewSeed}>
							New Seed
						</button>
					</div>
				</div>

				<div className="count-control">
					<label htmlFor="count">Number of tiles:</label>
					<input
						id="count"
						type="number"
						min="1"
						max="1000"
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
						aria-label="Number of tiles to generate"
					/>
				</div>
			</fieldset>

			<button
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating}
				aria-busy={isGenerating}
			>
				{isGenerating ? "Generating..." : "Generate tiles"}
			</button>
			{isGenerating && (
				<article className="generation-info" aria-busy="true">
					Generating {count} tiles with seed {seed}...
				</article>
			)}
		</div>
	);
}
