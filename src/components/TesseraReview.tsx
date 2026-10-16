import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { isGeneratingTilesAtom } from "../atoms/ui-atoms";
import {
	acceptSupplementationAtom,
	advanceFromReviewAtom,
	clearTesseraeAtom,
	hasAcceptedSupplementationAtom,
	isLowVarietyCollectionAtom,
	removeTesseraAtom,
	tesseraeAtom,
	varietyRecommendationAtom,
} from "../atoms/workflow-atoms";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackEvent } from "../telemetry";
import { ActionButton } from "./ActionButton";
import { Badge } from "./Badge";
import { OptionalButton } from "./OptionalButton";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/** Flash for the review summary when tiles are added while it is closed. */
const summaryFlash = stylex.keyframes({
	from: { backgroundColor: tokens.primarySoft },
	to: { backgroundColor: "transparent" },
});

const styles = stylex.create({
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(9.375rem, 1fr))",
		gap: "1rem",
		// The old stylesheet gave details content a 1rem margin on every side.
		margin: "1rem",
	},
	item: {
		position: "relative",
		padding: "0.75rem",
		borderRadius: tokens.radius,
		boxShadow: tokens.shadow,
		transition: "transform 0.2s ease",
		":hover": { transform: "translateY(-0.125rem)" },
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	itemInvalid: {
		borderWidth: "0.125rem",
		borderStyle: "solid",
		borderColor: tokens.invalid,
		backgroundColor: tokens.invalidSoft,
	},
	varietyBar: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "0.5rem 1rem",
		margin: "0 1rem",
		padding: "0.75rem 1rem",
		backgroundColor: tokens.surface,
		borderWidth: "0.0625rem",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderLeftWidth: "0.1875rem",
		borderLeftColor: tokens.primary,
	},
	varietyText: { margin: 0, flex: 1, fontSize: "0.9rem" },
	clearRow: { margin: "1rem" },
	loadingRow: {
		display: "flex",
		alignItems: "center",
		margin: "1rem 1rem 0",
		fontSize: "0.9rem",
		color: tokens.muted,
	},
	removeButton: {
		position: "absolute",
		top: "0.375rem",
		right: "0.375rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "1.5rem",
		height: "1.5rem",
		padding: 0,
		backgroundColor: tokens.background,
		color: tokens.muted,
		borderWidth: "0.0625rem",
		borderStyle: "solid",
		borderColor: tokens.border,
		cursor: "pointer",
		fontSize: "0.75rem",
		lineHeight: 1,
		// Thumbs need bigger targets than cursors.
		"@media (max-width: 36rem)": {
			width: "2rem",
			height: "2rem",
			fontSize: "0.875rem",
		},
		"@media (pointer: coarse)": {
			width: "2.75rem",
			height: "2.75rem",
			top: "0.25rem",
			right: "0.25rem",
			fontSize: "1rem",
		},
		":hover": { color: tokens.invalid, borderColor: tokens.invalid },
	},
	preview: {
		width: "100%",
		height: "6.25rem",
		objectFit: "cover",
		borderRadius: `calc(${tokens.radius} / 2)`,
		marginBottom: "0.5rem",
	},
	detailsText: { fontSize: "0.875rem" },
	name: { fontWeight: "bold", display: "block", marginBottom: "0.25rem" },
	error: { display: "block", margin: "0.25rem 0", fontSize: "0.875rem" },
	supplementedLabel: {
		fontSize: "0.875rem",
		fontWeight: "bold",
		color: tokens.primary,
		backgroundColor: tokens.primarySoft,
		padding: "0.1rem 0.3rem",
		borderRadius: `calc(${tokens.radius} / 2)`,
	},
	summaryPulse: {
		animationName: summaryFlash,
		animationDuration: "0.8s",
		animationTimingFunction: "ease-out",
		[REDUCED_MOTION]: { animationDuration: "0.01ms" },
	},
});

/**
 * Displays the tessera collection for review with validity stats,
 * variety warnings, and per-tessera removal. Reads and writes the
 * workflow atoms directly.
 */
export function TesseraReview() {
	const tesserae = useAtomValue(tesseraeAtom);
	const isLowVariety = useAtomValue(isLowVarietyCollectionAtom);
	const varietyRecommendation = useAtomValue(varietyRecommendationAtom);
	const hasAcceptedSupplementation = useAtomValue(
		hasAcceptedSupplementationAtom,
	);
	const removeTessera = useSetAtom(removeTesseraAtom);
	const clearTesserae = useSetAtom(clearTesseraeAtom);
	const isGenerating = useAtomValue(isGeneratingTilesAtom);
	const acceptSupplementation = useSetAtom(acceptSupplementationAtom);
	const advanceFromReview = useSetAtom(advanceFromReviewAtom);

	// Adding tiles keeps the accordion closed but pulses the summary to
	// signal the change. Rejected tiles always keep it open.
	const prevCountRef = useRef(tesserae.length);
	const prevGeneratingRef = useRef(isGenerating);
	const [summaryPulse, setSummaryPulse] = useState(false);

	useEffect(() => {
		if (
			tesserae.length > prevCountRef.current ||
			(isGenerating && !prevGeneratingRef.current)
		) {
			setSummaryPulse(true);
		}
		prevCountRef.current = tesserae.length;
		prevGeneratingRef.current = isGenerating;
	}, [tesserae.length, isGenerating]);

	const open = tesserae.some((tessera) => !tessera.isValid);
	const validCount = tesserae.filter((t) => t.isValid).length;
	const rejectedCount = tesserae.length - validCount;

	// Track when the tessera review section is viewed
	useEffect(() => {
		trackEvent("tessera_review_viewed", {
			tesseraCount: tesserae.length,
			validCount,
			rejectedCount,
			isLowVariety,
			varietyRecommendation,
			hasAcceptedSupplementation,
		});
	}, [
		tesserae.length,
		validCount,
		rejectedCount,
		isLowVariety,
		varietyRecommendation,
		hasAcceptedSupplementation,
	]);

	const warningProps = stylex.props(styles.varietyBar);

	return (
		<div>
			<div aria-live="polite" aria-atomic="true" {...stylex.props(base.srOnly)}>
				Tile counts updated: {validCount} valid, {rejectedCount} rejected
			</div>
			<details
				{...stylex.props(base.details)}
				open={open}
				aria-busy={isGenerating}
			>
				<summary
					{...stylex.props(base.summary, summaryPulse && styles.summaryPulse)}
					onAnimationEnd={() => setSummaryPulse(false)}
				>
					Review tiles ({validCount} valid, {rejectedCount} rejected)
				</summary>

				{isGenerating && (
					<p
						{...stylex.props(styles.loadingRow, base.busySpinner)}
						aria-live="polite"
					>
						Generating tiles...
					</p>
				)}

				{tesserae.length > 0 && (
					<div {...stylex.props(styles.clearRow)}>
						<ActionButton
							type="button"
							onClick={() => clearTesserae()}
							variant="secondary"
						>
							Clear all tiles
						</ActionButton>
					</div>
				)}

				{isLowVariety && varietyRecommendation && (
					<article
						{...warningProps}
						className={`warning-message ${warningProps.className}`}
						role="alert"
					>
						<Badge>(Optional)</Badge>
						<p {...stylex.props(styles.varietyText)}>
							You have {validCount} tiles, but {varietyRecommendation} are
							recommended.
						</p>
						{isLowVariety && (
							<OptionalButton
								type="button"
								onClick={() => acceptSupplementation()}
							>
								Add random tiles
							</OptionalButton>
						)}
					</article>
				)}

				<div {...stylex.props(styles.grid)}>
					{tesserae.map((tessera, index) => {
						const itemProps = stylex.props(
							styles.item,
							!tessera.isValid && styles.itemInvalid,
						);
						return (
							<div
								key={tessera.fileName}
								{...itemProps}
								className={[
									"tessera-item",
									!tessera.isValid && "invalid",
									tessera.isSupplemented && "supplemented",
									itemProps.className,
								]
									.filter(Boolean)
									.join(" ")}
							>
								{tessera.previewUrl && (
									<img
										src={tessera.previewUrl}
										alt={tessera.fileName}
										{...stylex.props(styles.preview)}
									/>
								)}
								<div {...stylex.props(styles.detailsText)}>
									<span {...stylex.props(styles.name)}>{tessera.fileName}</span>
									{!tessera.isValid && tessera.error && (
										<span {...stylex.props(styles.error)}>{tessera.error}</span>
									)}
									{tessera.isSupplemented && (
										<span {...stylex.props(styles.supplementedLabel)}>
											Supplemented
										</span>
									)}
								</div>
								<button
									type="button"
									onClick={() => removeTessera(index)}
									aria-label={`Remove ${tessera.fileName}`}
									{...stylex.props(styles.removeButton, base.focusOutline)}
								>
									<span aria-hidden="true">✕</span>
								</button>
							</div>
						);
					})}
				</div>
			</details>

			<div>
				<ActionButton
					type="button"
					onClick={() => advanceFromReview()}
					disabled={validCount === 0}
				>
					Continue to step 4 →
				</ActionButton>
			</div>
		</div>
	);
}
