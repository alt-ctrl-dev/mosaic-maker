import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { isGeneratingTilesAtom } from "../atoms/ui-atoms";
import {
	adjustedTesseraSizeAtom,
	appendGeneratedTesseraeAtom,
	generatedTesseraCountAtom,
	seedAtom,
	sourceImageAtom,
} from "../atoms/workflow-atoms";
import { generateNoiseTesseraeFromState } from "../engine/generate-noise-tesserae-helper";
import type { SourceImageInfo } from "../engine/image-processing";
import { calculateGridCellCount } from "../engine/tessera-sizing";
import { getVarietyRecommendation, SEED_MAX } from "../engine/workflow-state";
import { vibrate } from "../haptics";
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
	seedControl: { margin: "1rem" },
	controlLabel: {
		display: "block",
		marginBottom: "0.5rem",
		fontWeight: "bold",
	},
	inputGroup: { display: "flex", gap: "0.5rem", alignItems: "center" },
	flexField: { flex: 1 },
});

/**
 * Compute the default tessera count: the variety recommendation when source
 * image and tessera size are available, or 20 as a fallback.
 */
function computeDefaultTesseraCount(
	sourceImage: SourceImageInfo | null,
	adjustedTesseraSize: number | null,
): number {
	if (sourceImage && adjustedTesseraSize) {
		const gridCellCount = calculateGridCellCount(
			adjustedTesseraSize,
			sourceImage.width,
			sourceImage.height,
		);
		return getVarietyRecommendation(gridCellCount);
	}
	return 20;
}

/**
 * Controls for generating procedural noise-based tesserae.
 */
export function GeneratedTesserae() {
	const sourceImage = useAtomValue(sourceImageAtom);
	const adjustedTesseraSize = useAtomValue(adjustedTesseraSizeAtom);
	const [seed, setSeed] = useAtom(seedAtom);
	const [generatedTesseraCount, setGeneratedTesseraCount] = useAtom(
		generatedTesseraCountAtom,
	);
	const [isGenerating, setIsGenerating] = useAtom(isGeneratingTilesAtom);
	const appendGeneratedTesserae = useSetAtom(appendGeneratedTesseraeAtom);

	const count =
		generatedTesseraCount ??
		computeDefaultTesseraCount(sourceImage, adjustedTesseraSize);

	useEffect(() => {
		trackStepView("generated_tesserae");
	}, []);

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			const tesserae = await generateNoiseTesseraeFromState({
				sourceImage,
				adjustedTesseraSize,
				seed,
				generatedTesseraCount: count,
			});
			appendGeneratedTesserae(tesserae);

			trackEvent("tesserae_generation", {
				count: tesserae.length,
				requestedCount: count,
				tesseraSize: adjustedTesseraSize ?? 0,
				seed,
			});
			vibrate(15);
		} catch (error) {
			console.error("Error generating tesserae:", error);
			trackError("tesserae_generation", error, {
				seed,
				count,
				tesseraSize: adjustedTesseraSize ?? 0,
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const handleNewSeed = () => {
		setSeed(Math.floor(Math.random() * SEED_MAX));
	};

	return (
		<div {...stylex.props(styles.root)} data-testid="generated-tesserae">
			<fieldset {...stylex.props(base.fieldset, styles.controlGroup)}>
				<legend {...stylex.props(base.legend)}>Generate random tiles</legend>
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
						onChange={(e) => setGeneratedTesseraCount(Number(e.target.value))}
						aria-label="Number of tiles to generate"
						{...stylex.props(base.field, base.focusOutline)}
					/>
				</div>
				<details {...stylex.props(base.details)}>
					<summary {...stylex.props(base.summary)}>Advanced settings</summary>
					<div {...stylex.props(styles.control, styles.seedControl)}>
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
								{...stylex.props(
									base.field,
									base.focusOutline,
									styles.flexField,
								)}
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
				</details>
			</fieldset>

			<ActionButton
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating}
				aria-busy={isGenerating}
				variant="secondary"
			>
				{isGenerating ? "Generating..." : "Generate tiles"}
			</ActionButton>
		</div>
	);
}
