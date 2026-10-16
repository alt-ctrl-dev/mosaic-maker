import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { replaceTesseraeAtom, tesseraeAtom } from "../atoms/workflow-atoms";
import { renderBrick } from "../engine/brick";
import { createBrickTesserae } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { ActionButton } from "./ActionButton";

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
export function BrickColorPicker() {
	const tesserae = useAtomValue(tesseraeAtom);
	const replaceTesserae = useSetAtom(replaceTesseraeAtom);
	// The selected colors are the brick tesserae in the store; no local copy.
	const selectedColors = tesserae
		.map((tessera) => tessera.color)
		.filter((color): color is string => color !== undefined);
	const [customColor, setCustomColor] = useState("#FF0000");
	const [activePalette, setActivePalette] = useState<number | null>(null);

	const updateColors = (next: string[]) => {
		replaceTesserae(createBrickTesserae(next));
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
		<div>
			<h3 {...stylex.props(base.heading, base.h3)}>
				Select Colors (2-{MAX_COLORS} colors required)
			</h3>

			{selectedColors.length > 0 && (
				<div>
					<h4 {...stylex.props(base.heading, base.h4)}>Selected Colors:</h4>
					<div>
						{selectedColors.map((color) => (
							<div key={color}>
								<img
									src={renderBrick(color)}
									alt={`Brick tile ${color}`}
									title={color}
									{...stylex.props(base.brickPreview)}
								/>
								<ActionButton
									type="button"
									onClick={() => removeColor(color)}
									aria-label={`Remove color ${color}`}
									variant="outline"
								>
									×
								</ActionButton>
							</div>
						))}
					</div>
					<p {...stylex.props(base.paragraph)}>
						{selectedColors.length} color(s) selected
					</p>
				</div>
			)}

			<div>
				<h4 {...stylex.props(base.heading, base.h4)}>Preset Palettes</h4>
				{PRESET_PALETTES.map((palette, index) => (
					<div key={palette.name}>
						<ActionButton
							type="button"
							onClick={() => selectPalette(index)}
							variant={activePalette === index ? undefined : "secondary"}
						>
							{palette.name}
						</ActionButton>
						<div>
							{palette.colors.map((color) => (
								<div
									key={color}
									style={{ backgroundColor: color }}
									title={color}
									{...stylex.props(base.brickSwatch)}
								/>
							))}
						</div>
					</div>
				))}
			</div>

			<div>
				<h4 {...stylex.props(base.heading, base.h4)}>Custom Color</h4>
				<div>
					<input
						type="color"
						value={customColor}
						onChange={(e) => setCustomColor(e.target.value)}
						aria-label="Select custom color"
						{...stylex.props(base.colorInput, base.focusOutline)}
					/>
					<ActionButton
						type="button"
						onClick={addCustomColor}
						disabled={
							hasColor(customColor) || selectedColors.length >= MAX_COLORS
						}
					>
						Add Custom Color
					</ActionButton>
				</div>
			</div>

			{selectedColors.length < 2 && (
				<p {...stylex.props(base.paragraph)}>Please select at least 2 colors</p>
			)}
			{selectedColors.length >= MAX_COLORS && (
				<p {...stylex.props(base.paragraph)}>
					Maximum of {MAX_COLORS} colors reached
				</p>
			)}
		</div>
	);
}
