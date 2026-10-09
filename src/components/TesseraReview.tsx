import { useEffect } from "react";
import * as stylex from "@stylexjs/stylex";
import type { TesseraInfo } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { trackEvent } from "../telemetry";
import { ActionButton } from "./ActionButton";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const styles = stylex.create({
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
		gap: "1rem",
		// The old stylesheet gave details content a 1rem margin on every side.
		margin: "1rem",
	},
	item: {
		padding: "0.75rem",
		borderRadius: tokens.radius,
		boxShadow: tokens.shadow,
		transition: "transform 0.2s ease",
		":hover": { transform: "translateY(-2px)" },
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	itemInvalid: {
		borderWidth: "2px",
		borderStyle: "solid",
		borderColor: tokens.invalid,
		backgroundColor: tokens.invalidSoft,
	},
	itemSupplemented: {
		borderWidth: "2px",
		borderStyle: "solid",
		borderColor: tokens.valid,
	},
	preview: {
		width: "100%",
		height: "100px",
		objectFit: "cover",
		borderRadius: `calc(${tokens.radius} / 2)`,
		marginBottom: "0.5rem",
	},
	detailsText: { fontSize: "0.85em" },
	name: { fontWeight: "bold", display: "block", marginBottom: "0.25rem" },
	error: { display: "block", margin: "0.25rem 0", fontSize: "0.8em" },
	supplementedLabel: {
		fontSize: "0.7em",
		fontWeight: "bold",
		color: tokens.primary,
		backgroundColor: tokens.primarySoft,
		padding: "0.1rem 0.3rem",
		borderRadius: `calc(${tokens.radius} / 2)`,
	},
});

/** Props for {@link TesseraReview}. */
interface TesseraReviewProps {
	/** Tesserae to display in the review grid. */
	tesserae: TesseraInfo[];
	/** Called when the user removes a tessera at the given index. */
	onRemoveTessera: (index: number) => void;
	/** Called when the user accepts supplementing with generated tesserae. */
	onAcceptSupplementation?: () => void;
	/** Called when the user wants to continue to the next step. */
	onContinue?: () => void;
	/** Whether the collection has low variety. */
	isLowVariety?: boolean;
	/** Recommended number of tesserae for adequate variety. */
	varietyRecommendation?: number | null;
	/** Whether the user has already accepted supplementation. */
	hasAcceptedSupplementation?: boolean;
}

/**
 * Displays the tessera collection for review with validity stats,
 * variety warnings, and per-tessera removal.
 */
export function TesseraReview({
	tesserae,
	onRemoveTessera,
	onAcceptSupplementation,
	onContinue,
	isLowVariety = false,
	varietyRecommendation = null,
	hasAcceptedSupplementation = false,
}: TesseraReviewProps) {
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

	const warningProps = stylex.props(base.card);

	return (
		<div>
			<div aria-live="polite" aria-atomic="true" {...stylex.props(base.srOnly)}>
				Tessera counts updated: {validCount} valid, {rejectedCount} rejected
			</div>
			{isLowVariety && varietyRecommendation && (
				<article
					{...warningProps}
					className={`warning-message ${warningProps.className}`}
					role="alert"
				>
					<p {...stylex.props(base.paragraph)}>
						Low variety: You have {validCount} tesserae, but{" "}
						{varietyRecommendation} are recommended.
					</p>
					{onAcceptSupplementation && !hasAcceptedSupplementation && (
						<ActionButton
							type="button"
							onClick={onAcceptSupplementation}
							variant="outline"
						>
							Add random tiles
						</ActionButton>
					)}
				</article>
			)}

			<details {...stylex.props(base.details)}>
				<summary {...stylex.props(base.summary)}>
					Review tesserae ({validCount} valid, {rejectedCount} rejected)
				</summary>

				<div {...stylex.props(styles.grid)}>
					{tesserae.map((tessera, index) => {
						const itemProps = stylex.props(
							styles.item,
							!tessera.isValid && styles.itemInvalid,
							tessera.isSupplemented && styles.itemSupplemented,
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
								<ActionButton
									type="button"
									onClick={() => onRemoveTessera(index)}
									aria-label={`Remove ${tessera.fileName}`}
									variant="outline"
								>
									Remove
								</ActionButton>
							</div>
						);
					})}
				</div>
			</details>

			{onContinue && (
				<div>
					<ActionButton
						type="button"
						onClick={onContinue}
						disabled={validCount === 0}
					>
						Continue to step 3 →
					</ActionButton>
				</div>
			)}
		</div>
	);
}
