import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
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
 * Compute the default tessera count. Returns the explicit count when set,
 * the variety recommendation when source image and tessera size are
 * available, or 20 as a fallback.
 */
function computeDefaultTesseraCount(
	generatedTesseraCount: number | null,
	sourceImage: SourceImageInfo | null,
	adjustedTesseraSize: number | null,
): number {
	if (generatedTesseraCount !== null) {
		return generatedTesseraCount;
	}
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
	const stateSeed = useAtomValue(seedAtom);
	const generatedTesseraCount = useAtomValue(generatedTesseraCountAtom);
	const appendGeneratedTesserae = useSetAtom(appendGeneratedTesseraeAtom);

	const [isGenerating, setIsGenerating] = useState(false);
	const [seed, setSeed] = useState<number>(
		stateSeed ?? Math.floor(Math.random() * SEED_MAX),
	);
	const [count, setCount] = useState<number>(() =>
		computeDefaultTesseraCount(
			generatedTesseraCount,
			sourceImage,
			adjustedTesseraSize,
		),
	);

	useEffect(() => {
		trackStepView("generated_tesserae");
	}, []);

	useEffect(() => {
		if (stateSeed !== null) {
			setSeed(stateSeed);
		}
		setCount(
			computeDefaultTesseraCount(
				generatedTesseraCount,
				sourceImage,
				adjustedTesseraSize,
			),
		);
	}, [stateSeed, generatedTesseraCount, sourceImage, adjustedTesseraSize]);

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

	const generationInfoProps = stylex.props(
		base.card,
		base.busySpinner,
		styles.generationInfo,
	);

	return (
		<div {...stylex.props(styles.root)} data-testid="generated-tesserae">
			<fieldset {...stylex.props(base.fieldset, styles.controlGroup)}>
				<legend {...stylex.props(base.legend)}>Generate random tesserae</legend>
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
						Number of tesserae:
					</label>
					<input
						id="count"
						type="number"
						min="1"
						max="1000"
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
						aria-label="Number of tesserae to generate"
						{...stylex.props(base.field, base.focusOutline)}
					/>
				</div>
			</fieldset>

			<ActionButton
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating}
				aria-busy={isGenerating}
				variant="secondary"
			>
				{isGenerating ? "Generating..." : "Generate tesserae"}
			</ActionButton>
			{isGenerating && (
				<article
					{...generationInfoProps}
					className={`generation-info ${generationInfoProps.className}`}
					aria-busy="true"
				>
					Generating {count} tesserae with seed {seed}...
				</article>
			)}
		</div>
	);
}
