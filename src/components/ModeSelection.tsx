import type { MosaicMode } from "../engine/workflow-state";

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
	lego: "Create a mosaic using a limited color palette, rendered as flat squares",
};

/** Display titles for each mosaic mode. */
const MODE_TITLES: Record<MosaicMode, string> = {
	photomosaic: "Photomosaic (Default)",
	lego: "Lego Style",
};

/** All available modes as a typed array for safe iteration. */
const MODES: MosaicMode[] = ["photomosaic", "lego"];

/**
 * First workflow step that lets the user choose between photomosaic and
 * lego mosaic generation modes before proceeding to source image selection.
 */
export function ModeSelection({
	mode,
	onModeSelected,
	onContinue,
}: ModeSelectionProps) {
	return (
		<div className="mode-selection-container">
			<h2>Select Mosaic Style</h2>
			<p>Choose how you want your mosaic to look:</p>

			<div className="mode-options">
				{MODES.map((modeValue) => {
					const title = MODE_TITLES[modeValue];
					const isSelected = mode === modeValue;
					return (
						<div
							key={modeValue}
							className={`mode-option ${isSelected ? "selected" : ""}`}
						>
							<input
								type="radio"
								id={`mode-${modeValue}`}
								name="mosaic-mode"
								checked={isSelected}
								onChange={() => onModeSelected(modeValue)}
								aria-label={`Select ${title} mode`}
							/>
							<label htmlFor={`mode-${modeValue}`}>
								<h3>{title}</h3>
								<p>{MODE_DESCRIPTIONS[modeValue]}</p>
							</label>
						</div>
					);
				})}
			</div>

			<button
				type="button"
				onClick={onContinue}
				disabled={!mode}
				className="primary"
			>
				Continue
			</button>
		</div>
	);
}
