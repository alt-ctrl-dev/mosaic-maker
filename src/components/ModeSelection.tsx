import * as stylex from "@stylexjs/stylex";
import type { MosaicMode } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { ActionButton } from "./ActionButton";

/** Props for {@link ModeSelection}. */
interface ModeSelectionProps {
	/** Currently selected mosaic mode from workflow state. */
	mode: MosaicMode;
	/** Called when the user selects a different mode. */
	onModeSelected: (mode: MosaicMode) => void;
	/** Called when the user chooses to continue to the next step. */
	onContinue: () => void;
}

/** Human-readable descriptions for each mosaic mode. */
const MODE_DESCRIPTIONS: Record<MosaicMode, string> = {
	photomosaic:
		"Create a traditional photomosaic using your uploaded images as tesserae",
	brick:
		"Create a mosaic using a limited color palette, rendered as flat squares",
};

/** Display titles for each mosaic mode. */
const MODE_TITLES: Record<MosaicMode, string> = {
	photomosaic: "Photomosaic (Default)",
	brick: "Brick Style",
};

/** All available modes as a typed array for safe iteration. */
const MODES: MosaicMode[] = ["photomosaic", "brick"];

const styles = stylex.create({
	options: { display: "grid", gap: "1rem", marginBottom: "1.5rem" },
	option: {
		display: "flex",
		alignItems: "flex-start",
		gap: "0.75rem",
		padding: "1rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderRadius: tokens.radius,
	},
	selected: {
		borderColor: tokens.primary,
		backgroundColor: tokens.primarySoft,
	},
});

/**
 * First workflow step that lets the user choose between photomosaic and
 * brick mosaic generation modes before proceeding to source image selection.
 */
export function ModeSelection({
	mode,
	onModeSelected,
	onContinue,
}: ModeSelectionProps) {
	return (
		<div>
			<h2 {...stylex.props(base.heading, base.h2)}>Select Mosaic Style</h2>
			<p {...stylex.props(base.paragraph)}>
				Choose how you want your mosaic to look:
			</p>

			<div {...stylex.props(styles.options)}>
				{MODES.map((modeValue) => {
					const title = MODE_TITLES[modeValue];
					const isSelected = mode === modeValue;
					return (
						<div
							key={modeValue}
							{...stylex.props(styles.option, isSelected && styles.selected)}
						>
							<input
								type="radio"
								id={`mode-${modeValue}`}
								name="mosaic-mode"
								checked={isSelected}
								onChange={() => onModeSelected(modeValue)}
								aria-label={`Select ${title} mode`}
								{...stylex.props(base.accentPrimary, base.focusOutline)}
							/>
							<label
								htmlFor={`mode-${modeValue}`}
								{...stylex.props(base.label)}
							>
								<h3 {...stylex.props(base.heading, base.h3)}>{title}</h3>
								<p {...stylex.props(base.paragraph)}>
									{MODE_DESCRIPTIONS[modeValue]}
								</p>
							</label>
						</div>
					);
				})}
			</div>

			<ActionButton type="button" onClick={onContinue}>
				Continue
			</ActionButton>
		</div>
	);
}
