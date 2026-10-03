import { useState } from "react";
import { createLegoTesserae, type TesseraInfo } from "../engine/workflow-state";

/** Props for {@link LegoColorPicker}. */
interface LegoColorPickerProps {
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
		name: "Classic Lego",
		colors: [
			"#FF0000", // Red
			"#0000FF", // Blue
			"#FFFF00", // Yellow
			"#00FF00", // Green
			"#FFFFFF", // White
			"#000000", // Black
			"#FF6600", // Orange
			"#800080", // Purple
			"#FFC0CB", // Pink
			"#8B4513", // Brown
		],
	},
	{
		name: "Pastel Mix",
		colors: [
			"#FFB6C1", // Light Pink
			"#FFD700", // Gold
			"#E6E6FA", // Lavender
			"#98FB98", // Mint Green
			"#87CEEB", // Sky Blue
			"#FFE4B5", // Moccasin
			"#DDA0DD", // Plum
			"#F0E68C", // Khaki
			"#FAFAD2", // Light Goldenrod
			"#D8BFD8", // Thistle
		],
	},
];

/**
 * Color picker for Lego mosaic mode that lets the user select 2-15 colors
 * from preset palettes or a custom color wheel.
 */
export function LegoColorPicker({
	onTesseraeSelected,
	initialColors = [],
}: LegoColorPickerProps) {
	const [selectedColors, setSelectedColors] = useState<string[]>(initialColors);
	const [customColor, setCustomColor] = useState("#FF0000");
	const [activePalette, setActivePalette] = useState<number | null>(null);

	const updateColors = (next: string[]) => {
		setSelectedColors(next);
		onTesseraeSelected(createLegoTesserae(next));
	};

	const toggleColor = (color: string) => {
		if (selectedColors.includes(color)) {
			updateColors(selectedColors.filter((c) => c !== color));
		} else if (selectedColors.length < MAX_COLORS) {
			updateColors([...selectedColors, color]);
		}
	};

	const addCustomColor = () => {
		if (
			!selectedColors.includes(customColor) &&
			selectedColors.length < MAX_COLORS
		) {
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
		<div className="lego-color-picker">
			<h3>Select Colors (2-{MAX_COLORS} colors required)</h3>

			{selectedColors.length > 0 && (
				<div className="selected-colors">
					<h4>Selected Colors:</h4>
					<div className="color-list">
						{selectedColors.map((color) => (
							<div key={color} className="selected-color-item">
								<div
									className="color-swatch"
									style={{ backgroundColor: color }}
								/>
								<span>{color}</span>
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
							selectedColors.includes(customColor) ||
							selectedColors.length >= MAX_COLORS
						}
					>
						Add Custom Color
					</button>
				</div>
			</div>

			<div className="color-grid">
				<h4>Color Palette</h4>
				{PRESET_PALETTES.flatMap((palette) => palette.colors)
					.filter((color, index, self) => self.indexOf(color) === index)
					.map((color) => (
						<button
							key={color}
							type="button"
							className={`color-option ${
								selectedColors.includes(color) ? "selected" : ""
							}`}
							onClick={() => toggleColor(color)}
							aria-label={`Toggle color ${color}`}
							aria-pressed={selectedColors.includes(color)}
						>
							<div
								className="color-swatch"
								style={{ backgroundColor: color }}
							/>
						</button>
					))}
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
