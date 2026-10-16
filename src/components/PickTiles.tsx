import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import {
	clearTesseraeAtom,
	tesseraeAtom,
	validTesseraCountAtom,
	varietyRecommendationAtom,
} from "../atoms/workflow-atoms";
import { tokens } from "../styles/tokens.stylex";
import { ActionButton } from "./ActionButton";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraReview } from "./TesseraReview";
import { TesseraUpload } from "./TesseraUpload";

const styles = stylex.create({
	root: { display: "flex", flexDirection: "column", gap: "1rem" },
	meterRow: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "0.375rem 0.75rem",
	},
	meterTrack: {
		flex: 1,
		height: "0.5rem",
		backgroundColor: tokens.surface,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	meterFill: { height: "100%", backgroundColor: tokens.valid },
	meterLabel: {
		fontSize: "0.85rem",
		color: tokens.muted,
		fontVariantNumeric: "tabular-nums",
		whiteSpace: "nowrap",
	},
	segmented: { display: "flex", gap: "0.5rem" },
	segmentButton: {
		flex: 1,
		padding: "0.6rem 1rem",
		backgroundColor: tokens.surface,
		color: tokens.text,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		cursor: "pointer",
		fontSize: "0.95rem",
		"@media (max-width: 576px)": { padding: "0.5rem", fontSize: "0.85rem" },
	},
	segmentButtonActive: {
		borderColor: tokens.primary,
		backgroundColor: tokens.primarySoft,
		color: tokens.primary,
	},
	infoBanner: {
		margin: 0,
		padding: "0.75rem 1rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.info,
		color: tokens.text,
		fontSize: "0.875rem",
	},
});

type TesseraPath = "upload" | "generated";

/** Readiness of the collection: valid tiles vs. the variety recommendation. */
function ReadinessMeter() {
	const validCount = useAtomValue(validTesseraCountAtom);
	const recommendation = useAtomValue(varietyRecommendationAtom);
	if (!recommendation) return null;
	const ratio = Math.min(1, validCount / recommendation);
	return (
		<div {...stylex.props(styles.meterRow)}>
			<div {...stylex.props(styles.meterTrack)}>
				<div
					{...stylex.props(styles.meterFill)}
					style={{ width: `${ratio * 100}%` }}
				/>
			</div>
			<span {...stylex.props(styles.meterLabel)}>
				{validCount} of ~{recommendation} recommended
			</span>
		</div>
	);
}

/**
 * Step 3 for photomosaic mode: a guided path. The user picks one tile
 * source at a time (own photos or generated tiles) behind a segmented
 * toggle, with the collection's readiness metered up top. Chosen over
 * parallel "Upload OR Generate" panels in the step3-flow prototype
 * (issue #312).
 */
export function PickTiles() {
	const [path, setPath] = useState<TesseraPath>("upload");
	const hasTesserae = useAtomValue(tesseraeAtom).length > 0;
	const clearTesserae = useSetAtom(clearTesseraeAtom);

	return (
		<div {...stylex.props(styles.root)} data-testid="pick-tiles">
			<ReadinessMeter />
			<div {...stylex.props(styles.segmented)}>
				<button
					type="button"
					aria-pressed={path === "upload"}
					onClick={() => setPath("upload")}
					{...stylex.props(
						styles.segmentButton,
						path === "upload" && styles.segmentButtonActive,
					)}
				>
					Choose your photos
				</button>
				<button
					type="button"
					aria-pressed={path === "generated"}
					onClick={() => setPath("generated")}
					{...stylex.props(
						styles.segmentButton,
						path === "generated" && styles.segmentButtonActive,
					)}
				>
					Generated tiles
				</button>
			</div>
			{path === "upload" ? (
				<>
					<p {...stylex.props(styles.infoBanner)} role="note">
						Each image is cropped to your chosen tile size and becomes a tile in
						your mosaic. Tiles may repeat; unused photos stay unused. Your files
						never leave your device.
					</p>
					<TesseraUpload />
				</>
			) : (
				<GeneratedTesserae />
			)}
			{hasTesserae && (
				<>
					<ActionButton
						type="button"
						onClick={() => clearTesserae()}
						variant="secondary"
						style={{ alignSelf: "flex-start" }}
					>
						Clear all tiles
					</ActionButton>
					<TesseraReview />
				</>
			)}
		</div>
	);
}
