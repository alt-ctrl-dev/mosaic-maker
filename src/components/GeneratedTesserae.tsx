import { useState, useEffect } from "react";
import { generateNoiseTesseraeFromState } from "../engine/generate-noise-tesserae-helper";
import {
	SEED_MAX,
	type WorkflowState,
	type TesseraInfo,
	getVarietyRecommendation,
} from "../engine/workflow-state";
import { calculateGridCellCount } from "../engine/tessera-sizing";

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

	// Calculate the default count based on grid cell count recommendation
	const getDefaultCount = (): number => {
		if (initialState.generatedTesseraCount !== null) {
			return initialState.generatedTesseraCount;
		}

		if (initialState.sourceImage && initialState.adjustedTesseraSize) {
			const gridCellCount = calculateGridCellCount(
				initialState.adjustedTesseraSize,
				initialState.sourceImage.width,
				initialState.sourceImage.height,
			);
			return getVarietyRecommendation(gridCellCount);
		}

		return 20; // Fallback default
	};

	const [count, setCount] = useState<number>(getDefaultCount());

	useEffect(() => {
		if (initialState.seed !== null) {
			setSeed(initialState.seed);
		}

		// If there's an explicit count in state, use it
		if (initialState.generatedTesseraCount !== null) {
			setCount(initialState.generatedTesseraCount);
		}
		// Otherwise, if source image or tessera size changes, recalculate default
		else if (initialState.sourceImage && initialState.adjustedTesseraSize) {
			const gridCellCount = calculateGridCellCount(
				initialState.adjustedTesseraSize,
				initialState.sourceImage.width,
				initialState.sourceImage.height,
			);
			const recommendedCount = getVarietyRecommendation(gridCellCount);
			setCount(recommendedCount);
		}
	}, [
		initialState.seed,
		initialState.generatedTesseraCount,
		initialState.sourceImage,
		initialState.adjustedTesseraSize,
	]);

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
		<div className="generated-tesserae">
			<fieldset className="control-group">
				<legend>Generation Settings</legend>
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
					<label htmlFor="count">Number of tesserae:</label>
					<input
						id="count"
						type="number"
						min="1"
						max="1000"
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
						aria-label="Number of tesserae to generate"
					/>
				</div>
			</fieldset>

			<button
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating}
				aria-busy={isGenerating}
			>
				{isGenerating ? "Generating..." : "Generate Tesserae"}
			</button>
			{isGenerating && (
				<article className="generation-info" aria-busy="true">
					Generating {count} tesserae with seed {seed}...
				</article>
			)}
		</div>
	);
}
