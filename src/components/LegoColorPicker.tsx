import { useState, useEffect } from "react";

interface LegoColorPickerProps {
	onColorsSelected: (colors: string[]) => void;
	initialColors?: string[];
}

// Predefined color palettes
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

export function LegoColorPicker({
	onColorsSelected,
	initialColors = [],
}: LegoColorPickerProps) {
	const [selectedColors, setSelectedColors] = useState<string[]>(initialColors);
	const [customColor, setCustomColor] = useState("#FF0000");
	const [activePalette, setActivePalette] = useState<number | null>(null);

	useEffect(() => {
		onColorsSelected(selectedColors);
	}, [selectedColors, onColorsSelected]);

	const toggleColor = (color: string) => {
		if (selectedColors.includes(color)) {
			setSelectedColors(selectedColors.filter((c) => c !== color));
		} else if (selectedColors.length < 15) {
			setSelectedColors([...selectedColors, color]);
		}
	};

	const addCustomColor = () => {
		if (!selectedColors.includes(customColor) && selectedColors.length < 15) {
			setSelectedColors([...selectedColors, customColor]);
		}
	};

	const removeColor = (color: string) => {
		setSelectedColors(selectedColors.filter((c) => c !== color));
	};

	const selectPalette = (paletteIndex: number) => {
		const palette = PRESET_PALETTES[paletteIndex];
		setSelectedColors(palette.colors.slice(0, 15)); // Limit to 15 colors
		setActivePalette(paletteIndex);
	};

	return (
		<div className="lego-color-picker">
			<h3>Select Colors (2-15 colors required)</h3>

			{selectedColors.length > 0 && (
				<div className="selected-colors">
					<h4>Selected Colors:</h4>
					<div className="color-list">
						{selectedColors.map((color, index) => (
							<div key={index} className="selected-color-item">
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
					<div key={index} className="palette-option">
						<button
							type="button"
							onClick={() => selectPalette(index)}
							className={activePalette === index ? "active" : ""}
						>
							{palette.name}
						</button>
						<div className="palette-colors">
							{palette.colors.map((color, colorIndex) => (
								<div
									key={colorIndex}
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
							selectedColors.length >= 15
						}
					>
						Add Custom Color
					</button>
				</div>
			</div>

			<div className="color-grid">
				<h4>Color Palette</h4>
				{PRESET_PALETTES.flatMap((palette) => palette.colors)
					.filter((color, index, self) => self.indexOf(color) === index) // Unique colors only
					.map((color, index) => (
						<div
							key={index}
							className={`color-option ${
								selectedColors.includes(color) ? "selected" : ""
							}`}
							onClick={() => toggleColor(color)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									toggleColor(color);
								}
							}}
							role="button"
							tabIndex={0}
							aria-label={`Toggle color ${color}`}
						>
							<div
								className="color-swatch"
								style={{ backgroundColor: color }}
							/>
						</div>
					))}
			</div>

			{selectedColors.length < 2 && (
				<p className="warning">Please select at least 2 colors</p>
			)}
			{selectedColors.length >= 15 && (
				<p className="info">Maximum of 15 colors reached</p>
			)}
		</div>
	);
}
