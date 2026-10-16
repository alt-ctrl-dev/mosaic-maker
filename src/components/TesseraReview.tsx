import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
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
		position: "relative",
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
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		cursor: "pointer",
		fontSize: "0.75rem",
		lineHeight: 1,
		":hover": { color: tokens.invalid, borderColor: tokens.invalid },
	},
	preview: {
		width: "100%",
		height: "100px",
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
	const acceptSupplementation = useSetAtom(acceptSupplementationAtom);
	const advanceFromReview = useSetAtom(advanceFromReviewAtom);

	// Open the accordion as soon as tiles are added; the user can still
	// collapse it. Rejected tiles always keep it open.
	const prevCountRef = useRef(tesserae.length);
	const [openedOnAdd, setOpenedOnAdd] = useState(false);

	useEffect(() => {
		if (tesserae.length > prevCountRef.current) setOpenedOnAdd(true);
		prevCountRef.current = tesserae.length;
	}, [tesserae.length]);

	const open = tesserae.some((tessera) => !tessera.isValid) || openedOnAdd;
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
				Tile counts updated: {validCount} valid, {rejectedCount} rejected
			</div>
			<details
				{...stylex.props(base.details)}
				open={open}
				onToggle={(event) => {
					if (!event.currentTarget.open) setOpenedOnAdd(false);
				}}
			>
				<summary {...stylex.props(base.summary)}>
					Review tiles ({validCount} valid, {rejectedCount} rejected)
				</summary>

				{isLowVariety && varietyRecommendation && (
					<article
						{...warningProps}
						className={`warning-message ${warningProps.className}`}
						role="alert"
					>
						<p {...stylex.props(base.paragraph)}>
							Low variety: You have {validCount} tiles, but{" "}
							{varietyRecommendation} are recommended.
						</p>
						{isLowVariety && !hasAcceptedSupplementation && (
							<ActionButton
								type="button"
								onClick={() => acceptSupplementation()}
								variant="outline"
							>
								Add random tiles
							</ActionButton>
						)}
					</article>
				)}

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

				<ActionButton
					type="button"
					onClick={() => clearTesserae()}
					variant="secondary"
				>
					Clear all tiles
				</ActionButton>
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
