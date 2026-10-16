import * as stylex from "@stylexjs/stylex";
import { useAtomValue } from "jotai";
import {
	adjustedTesseraSizeAtom,
	currentStepAtom,
	sourceImageAtom,
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
		alignItems: "center",
		justifyContent: "space-between",
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
		alignItems: "center",
		gap: "1.5rem",
	},
	item: {
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

interface SelectionSummaryProps {
	/** Called when the user asks to change the source image. */
	onChangeSource: () => void;
}

/**
 * Summarizes the selections made so far in the workflow: the source image
 * once it is chosen, and the committed tile size once the size step is
 * completed. Hidden until a source image exists.
 */
export function SelectionSummary({ onChangeSource }: SelectionSummaryProps) {
	const sourceImage = useAtomValue(sourceImageAtom);
	const currentStep = useAtomValue(currentStepAtom);
	const adjustedTesseraSize = useAtomValue(adjustedTesseraSizeAtom);

	if (!sourceImage || currentStep <= WorkflowStep.CHOOSE_SOURCE_IMAGE) {
		return null;
	}

	const showTileSize =
		adjustedTesseraSize !== null && currentStep > WorkflowStep.PICK_TILE_SIZE;

	return (
		<div {...stylex.props(styles.bar)} data-testid="selection-summary">
			<div {...stylex.props(styles.items)}>
				<div {...stylex.props(styles.item)}>
					<img
						src={sourceImage.url}
						alt="Source"
						{...stylex.props(styles.thumbnail)}
					/>
					<span {...stylex.props(styles.detail)}>
						{sourceImage.width} × {sourceImage.height} pixels
					</span>
				</div>

				{showTileSize && (
					<div {...stylex.props(styles.item)}>
						<span {...stylex.props(styles.detail)}>
							Tile size: {adjustedTesseraSize} × {adjustedTesseraSize} px
						</span>
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={onChangeSource}
				aria-label="Change source image"
				{...stylex.props(styles.changeButton, base.focusOutline)}
			>
				Change image
			</button>
		</div>
	);
}
