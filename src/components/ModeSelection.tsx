import { useState, useEffect } from "react";
import type { MosaicMode } from "../engine/workflow-state";

interface ModeSelectionProps {
	mode: MosaicMode;
	onModeSelected: (mode: MosaicMode) => void;
	onContinue: () => void;
}

const MODE_DESCRIPTIONS: Record<MosaicMode, string> = {
	photomosaic:
		"Create a traditional photomosaic using your uploaded images as tesserae",
	lego: "Create a mosaic using a limited color palette, rendered as flat squares",
};

const MODE_TITLES: Record<MosaicMode, string> = {
	photomosaic: "Photomosaic (Default)",
	lego: "Lego Style",
};

export function ModeSelection({
	mode,
	onModeSelected,
	onContinue,
}: ModeSelectionProps) {
	const [selectedMode, setSelectedMode] = useState<MosaicMode>(mode);

	useEffect(() => {
		setSelectedMode(mode);
	}, [mode]);

	const handleModeChange = (newMode: MosaicMode) => {
		setSelectedMode(newMode);
		onModeSelected(newMode);
	};

	return (
		<div className="mode-selection-container">
			<h2>Select Mosaic Style</h2>
			<p>Choose how you want your mosaic to look:</p>

			<div className="mode-options">
				{Object.entries(MODE_TITLES).map(([modeKey, title]) => {
					const modeValue = modeKey as MosaicMode;
					return (
						<div
							key={modeValue}
							className={`mode-option ${
								selectedMode === modeValue ? "selected" : ""
							}`}
							onClick={() => handleModeChange(modeValue)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									handleModeChange(modeValue);
								}
							}}
							role="button"
							tabIndex={0}
							aria-checked={selectedMode === modeValue}
						>
							<input
								type="radio"
								id={`mode-${modeValue}`}
								name="mosaic-mode"
								checked={selectedMode === modeValue}
								onChange={() => handleModeChange(modeValue)}
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
				disabled={!selectedMode}
				className="primary"
			>
				Continue
			</button>
		</div>
	);
}
