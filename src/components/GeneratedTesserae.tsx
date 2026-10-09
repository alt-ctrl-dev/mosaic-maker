import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { generateNoiseTesseraeFromState } from "../engine/generate-noise-tesserae-helper";
import { calculateGridCellCount } from "../engine/tessera-sizing";
import {
	getVarietyRecommendation,
	SEED_MAX,
	type TesseraInfo,
	type WorkflowState,
} from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackError, trackEvent, trackStepView } from "../telemetry";
import { ActionButton } from "./ActionButton";

const styles = stylex.create({
	root: { flex: 1 },
	controlGroup: {
		marginBottom: "1.5rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderRadius: tokens.radius,
		padding: "1rem",
	},
	control: { marginBottom: "1rem" },
	controlLabel: {
		display: "block",
		marginBottom: "0.5rem",
		fontWeight: "bold",
	},
	inputGroup: { display: "flex", gap: "0.5rem", alignItems: "center" },
	flexField: { flex: 1 },
	generationInfo: { marginTop: "1rem", fontSize: "0.9em" },
});

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
		trackStepView("generated_tesserae");
	}, []);

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

			trackEvent("tesserae_generation", {
				count: tesserae.length,
				requestedCount: count,
				tesseraSize: initialState.adjustedTesseraSize ?? 0,
				seed,
			});
		} catch (error) {
			console.error("Error generating tesserae:", error);
			trackError("tesserae_generation", error, {
				seed,
				count,
				tesseraSize: initialState.adjustedTesseraSize ?? 0,
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const handleNewSeed = () => {
		setSeed(Math.floor(Math.random() * SEED_MAX));
	};

	const generationInfoProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.generationInfo,
	);

	return (
		<div {...stylex.props(styles.root)} data-testid="generated-tesserae">
			<fieldset {...stylex.props(base.fieldset, styles.controlGroup)}>
				<legend {...stylex.props(base.legend)}>Generate random tiles</legend>
				<div {...stylex.props(styles.control)}>
					<label
						htmlFor="seed"
						{...stylex.props(base.label, styles.controlLabel)}
					>
						Seed:
					</label>
					<div {...stylex.props(styles.inputGroup)}>
						<input
							id="seed"
							type="number"
							value={seed}
							onChange={(e) => setSeed(Number(e.target.value))}
							aria-label="Seed value for generation"
							{...stylex.props(base.field, base.focusOutline, styles.flexField)}
						/>
						<ActionButton
							type="button"
							onClick={handleNewSeed}
							variant="secondary"
						>
							New Seed
						</ActionButton>
					</div>
				</div>

				<div {...stylex.props(styles.control)}>
					<label
						htmlFor="count"
						{...stylex.props(base.label, styles.controlLabel)}
					>
						Number of tiles:
					</label>
					<input
						id="count"
						type="number"
						min="1"
						max="1000"
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
						aria-label="Number of tiles to generate"
						{...stylex.props(base.field, base.focusOutline)}
					/>
				</div>
			</fieldset>

			<ActionButton
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating}
				aria-busy={isGenerating}
			>
				{isGenerating ? "Generating..." : "Generate tiles"}
			</ActionButton>
			{isGenerating && (
				<article
					{...generationInfoProps}
					className={`generation-info ${generationInfoProps.className}`}
					aria-busy="true"
				>
					Generating {count} tiles with seed {seed}...
				</article>
			)}
		</div>
	);
}
