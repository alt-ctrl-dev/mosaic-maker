import { useState } from "react";
import {
	createBrickTesserae,
	type TesseraInfo,
} from "../engine/workflow-state";
import { renderBrick } from "../engine/brick";

/** Props for {@link BrickColorPicker}. */
interface BrickColorPickerProps {
	/** Called with synthetic tesserae for the updated set of selected colors. */
	onTesseraeSelected: (tesserae: TesseraInfo[]) => void;
	/** Previously selected colors to restore when revisiting this step. */
	initialColors?: string[];
}

/** Maximum number of colors the user can select. */
const MAX_COLORS = 15;

/** Preset color palettes the user can choose from. */
const PRESET_PALETTES = [
	{
		name: "Classic Bricks",
		colors: [
			"#FF0000",
			"#0000FF",
			"#FFFF00",
			"#00FF00",
			"#FFFFFF",
			"#000000",
			"#FF6600",
			"#800080",
			"#FFC0CB",
			"#8B4513",
		],
	},
	{
		name: "Pastel Mix",
		colors: [
			"#FFB6C1",
			"#FFD700",
			"#E6E6FA",
			"#98FB98",
			"#87CEEB",
			"#FFE4B5",
			"#DDA0DD",
			"#F0E68C",
			"#FAFAD2",
			"#D8BFD8",
		],
	},
];

/**
 * Color picker for Brick mosaic mode that lets the user select 2-15 colors
 * from preset palettes or a custom color wheel.
 */
export function BrickColorPicker({
	onTesseraeSelected,
	initialColors = [],
}: BrickColorPickerProps) {
	const [selectedColors, setSelectedColors] = useState<string[]>(initialColors);
	const [customColor, setCustomColor] = useState("#FF0000");
	const [activePalette, setActivePalette] = useState<number | null>(null);

	const updateColors = (next: string[]) => {
		setSelectedColors(next);
		onTesseraeSelected(createBrickTesserae(next));
	};

	// Case-insensitive check: <input type="color"> emits lowercase hex
	// while preset palettes use uppercase, so plain includes() misses dupes.
	const hasColor = (color: string) =>
		selectedColors.some((c) => c.toLowerCase() === color.toLowerCase());

	const addCustomColor = () => {
		if (!hasColor(customColor) && selectedColors.length < MAX_COLORS) {
			updateColors([...selectedColors, customColor]);
		}
	};

	const removeColor = (color: string) => {
		updateColors(selectedColors.filter((c) => c !== color));
	};

	const selectPalette = (paletteIndex: number) => {
		const palette = PRESET_PALETTES[paletteIndex];
		updateColors(palette.colors.slice(0, MAX_COLORS));
		setActivePalette(paletteIndex);
	};

	return (
		<div className="brick-color-picker">
			<h3>Select Colors (2-{MAX_COLORS} colors required)</h3>

			{selectedColors.length > 0 && (
				<div className="selected-colors">
					<h4>Selected Colors:</h4>
					<div className="color-list">
						{selectedColors.map((color) => (
							<div key={color} className="selected-color-item">
								<img
									className="color-swatch"
									src={renderBrick(color)}
									alt={`Brick tessera ${color}`}
									title={color}
								/>
								<button
									type="button"
									onClick={() => removeColor(color)}
									aria-label={`Remove color ${color}`}
								>
									×
								</button>
							</div>
						))}
					</div>
					<p>{selectedColors.length} color(s) selected</p>
				</div>
			)}

			<div className="preset-palettes">
				<h4>Preset Palettes</h4>
				{PRESET_PALETTES.map((palette, index) => (
					<div key={palette.name} className="palette-option">
						<button
							type="button"
							onClick={() => selectPalette(index)}
							className={activePalette === index ? "active" : ""}
						>
							{palette.name}
						</button>
						<div className="palette-colors">
							{palette.colors.map((color) => (
								<div
									key={color}
									className="palette-color"
									style={{ backgroundColor: color }}
									title={color}
								/>
							))}
						</div>
					</div>
				))}
			</div>

			<div className="custom-color-section">
				<h4>Custom Color</h4>
				<div className="custom-color-controls">
					<input
						type="color"
						value={customColor}
						onChange={(e) => setCustomColor(e.target.value)}
						aria-label="Select custom color"
					/>
					<button
						type="button"
						onClick={addCustomColor}
						disabled={
							hasColor(customColor) || selectedColors.length >= MAX_COLORS
						}
					>
						Add Custom Color
					</button>
				</div>
			</div>

			{selectedColors.length < 2 && (
				<p className="warning">Please select at least 2 colors</p>
			)}
			{selectedColors.length >= MAX_COLORS && (
				<p className="info">Maximum of {MAX_COLORS} colors reached</p>
			)}
		</div>
	);
}
