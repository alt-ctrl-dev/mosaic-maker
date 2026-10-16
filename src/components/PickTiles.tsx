import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { tokens } from "../styles/tokens.stylex";
import { GeneratedTesserae } from "./GeneratedTesserae";
import { TesseraReview } from "./TesseraReview";
import { TesseraUpload } from "./TesseraUpload";

const styles = stylex.create({
	root: { display: "flex", flexDirection: "column", gap: "1rem" },
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

/**
 * Step 3 for photomosaic mode: a guided path. The user picks one tile
 * source at a time (own photos or generated tiles) behind a segmented
 * toggle. Chosen over parallel "Upload OR Generate" panels in the
 * step3-flow prototype (issue #312).
 */
export function PickTiles() {
	const [path, setPath] = useState<TesseraPath>("upload");

	return (
		<div {...stylex.props(styles.root)} data-testid="pick-tiles">
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
					Generate random tiles
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
			<TesseraReview />
		</div>
	);
}
