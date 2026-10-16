import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import {
	adjustedTesseraSizeAtom,
	currentStepAtom,
	goToStepAtom,
	sourceImageAtom,
	validTesseraCountAtom,
} from "../atoms/workflow-atoms";
import { WorkflowStep } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";

const styles = stylex.create({
	// A running summary of the picks made so far (source image, tile size, ...)
	// shown once the user moves past the source step. New picks are appended
	// here as additional items.
	bar: {
		boxSizing: "border-box",
		display: "flex",
		width: "100%",
		maxWidth: "48rem",
		marginInline: "auto",
		marginTop: "1rem",
		marginBottom: "0.5rem",
		padding: "1rem",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: tokens.border,
	},
	items: {
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
		width: "100%",
		gap: "0.75rem",
	},
	item: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "1rem",
	},
	itemInfo: {
		display: "flex",
		alignItems: "center",
		gap: "1rem",
	},
	thumbnail: {
		width: "40px",
		height: "40px",
		objectFit: "cover",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	// The thumbnail itself is also a "change image" affordance.
	thumbnailButton: {
		appearance: "none",
		backgroundColor: "transparent",
		borderWidth: 0,
		borderStyle: "none",
		padding: 0,
		lineHeight: 0,
		cursor: "pointer",
	},
	detail: {
		fontSize: "0.85rem",
		color: tokens.muted,
		fontVariantNumeric: "tabular-nums",
	},
	changeButton: {
		backgroundColor: "transparent",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderRadius: "999px",
		color: tokens.muted,
		fontSize: "0.75rem",
		padding: "0.2rem 0.6rem",
		cursor: "pointer",
		":hover": {
			color: tokens.text,
			borderColor: tokens.primary,
		},
	},
});

/**
 * Summarizes the selections made so far in the workflow: the source image
 * once it is chosen, the committed tile size once the size step is
 * completed, and the tile collection once tiles are chosen. Hidden until a
 * source image exists. Each item carries a button that navigates back to
 * its step through {@link goToStepAtom}.
 */
export function SelectionSummary() {
	const sourceImage = useAtomValue(sourceImageAtom);
	const currentStep = useAtomValue(currentStepAtom);
	const adjustedTesseraSize = useAtomValue(adjustedTesseraSizeAtom);
	const validTesseraCount = useAtomValue(validTesseraCountAtom);
	const goToStep = useSetAtom(goToStepAtom);

	if (!sourceImage || currentStep <= WorkflowStep.CHOOSE_SOURCE_IMAGE) {
		return null;
	}

	const showTileSize =
		adjustedTesseraSize !== null && currentStep > WorkflowStep.PICK_TILE_SIZE;
	const showTiles =
		validTesseraCount > 0 && currentStep > WorkflowStep.PICK_TILES;

	return (
		<div {...stylex.props(styles.bar)} data-testid="selection-summary">
			<div {...stylex.props(styles.items)}>
				<div {...stylex.props(styles.item)}>
					<div {...stylex.props(styles.itemInfo)}>
						<button
							type="button"
							onClick={() => goToStep(WorkflowStep.CHOOSE_SOURCE_IMAGE)}
							aria-label="Change source image"
							{...stylex.props(styles.thumbnailButton, base.focusOutline)}
						>
							<img
								src={sourceImage.url}
								alt="Source"
								{...stylex.props(styles.thumbnail)}
							/>
						</button>
						<span {...stylex.props(styles.detail)}>
							{sourceImage.width} × {sourceImage.height} pixels
						</span>
					</div>
					<button
						type="button"
						onClick={() => goToStep(WorkflowStep.CHOOSE_SOURCE_IMAGE)}
						{...stylex.props(styles.changeButton, base.focusOutline)}
					>
						Change image
					</button>
				</div>

				{showTileSize && (
					<div {...stylex.props(styles.item)}>
						<span {...stylex.props(styles.detail)}>
							Tile size: {adjustedTesseraSize} × {adjustedTesseraSize} px
						</span>
						<button
							type="button"
							onClick={() => goToStep(WorkflowStep.PICK_TILE_SIZE)}
							aria-label="Change tile size"
							{...stylex.props(styles.changeButton, base.focusOutline)}
						>
							Change size
						</button>
					</div>
				)}

				{showTiles && (
					<div {...stylex.props(styles.item)}>
						<span {...stylex.props(styles.detail)}>
							Tiles: {validTesseraCount}
						</span>
						<button
							type="button"
							onClick={() => goToStep(WorkflowStep.PICK_TILES)}
							aria-label="Change tiles"
							{...stylex.props(styles.changeButton, base.focusOutline)}
						>
							Change tiles
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
