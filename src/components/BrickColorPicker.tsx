import * as stylex from "@stylexjs/stylex";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	activeBrickPaletteAtom,
	customBrickColorAtom,
} from "../atoms/ui-atoms";
import { replaceTesseraeAtom, tesseraeAtom } from "../atoms/workflow-atoms";
import { renderBrick } from "../engine/brick";
import { createBrickTesserae } from "../engine/workflow-state";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";
import { ActionButton } from "./ActionButton";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/** Maximum number of colors the user can select. */
const MAX_COLORS = 15;

/** Minimum number of colors required to generate. */
const MIN_COLORS = 2;

/** Stable identities for the tray's empty placeholder slots. */
const EMPTY_SLOT_IDS = Array.from(
	{ length: MAX_COLORS },
	(_, i) => `slot-${i}`,
);

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
	{
		name: "Earth & Clay",
		colors: [
			"#B7410E",
			"#E97451",
			"#A0522D",
			"#CD853F",
			"#D2B48C",
			"#F5F5DC",
			"#556B2F",
			"#BDB76B",
			"#704214",
			"#FFE4C4",
		],
	},
	{
		name: "Twilight",
		colors: [
			"#191970",
			"#1E90FF",
			"#4169E1",
			"#483D8B",
			"#9370DB",
			"#008B8B",
			"#2F4F4F",
			"#708090",
			"#B0C4DE",
			"#F8F8FF",
		],
	},
];

const PRESET_COLORS = new Set(
	PRESET_PALETTES.flatMap((palette) =>
		palette.colors.map((color) => color.toLowerCase()),
	),
);

/**
 * Color picker for Brick mosaic mode: a 15-slot tray holds the selection,
 * and every palette brick is a tap-to-toggle cell. The user picks 2-15
 * colors from preset palettes or a custom color wheel.
 */
export function BrickColorPicker() {
	const tesserae = useAtomValue(tesseraeAtom);
	const replaceTesserae = useSetAtom(replaceTesseraeAtom);
	// The selected colors are the brick tesserae in the store; no local copy.
	const selectedColors = tesserae
		.map((tessera) => tessera.color)
		.filter((color): color is string => color !== undefined);
	const [customColor, setCustomColor] = useAtom(customBrickColorAtom);
	const [activePalette, setActivePalette] = useAtom(activeBrickPaletteAtom);

	const count = selectedColors.length;
	const isFull = count >= MAX_COLORS;

	const updateColors = (next: string[]) => {
		replaceTesserae(createBrickTesserae(next));
	};

	// Case-insensitive check: <input type="color"> emits lowercase hex
	// while preset palettes use uppercase, so plain includes() misses dupes.
	const hasColor = (color: string) =>
		selectedColors.some((c) => c.toLowerCase() === color.toLowerCase());

	const toggleColor = (color: string) => {
		if (hasColor(color)) {
			updateColors(selectedColors.filter((c) => c !== color));
		} else if (!isFull) {
			updateColors([...selectedColors, color]);
		}
		setActivePalette(null);
	};

	const addCustomColor = () => {
		if (!hasColor(customColor) && !isFull) {
			updateColors([...selectedColors, customColor]);
			setActivePalette(null);
		}
	};

	const loadPalette = (paletteIndex: number) => {
		const palette = PRESET_PALETTES[paletteIndex];
		updateColors(palette.colors.slice(0, MAX_COLORS));
		setActivePalette(paletteIndex);
	};

	// Selected colors that are in no preset render in a "Mine" group so
	// custom bricks toggle exactly like preset bricks.
	const customSelected = selectedColors.filter(
		(color) => !PRESET_COLORS.has(color.toLowerCase()),
	);

	return (
		<div>
			<h3 {...stylex.props(base.heading, base.h3)}>Pick your tiles</h3>
			<p {...stylex.props(base.paragraph, styles.hint)}>
				Tap a brick to add it to the tray; tap it again to remove it.
			</p>

			<div {...stylex.props(styles.trayHeader)}>
				<h4
					id="brick-tray-label"
					{...stylex.props(base.heading, base.h4, styles.groupLabel)}
				>
					Tray
				</h4>
				<span {...stylex.props(styles.countReadout)}>
					{count} / {MAX_COLORS} tiles
				</span>
			</div>
			<fieldset
				aria-labelledby="brick-tray-label"
				{...stylex.props(styles.groupReset, styles.tray)}
			>
				{selectedColors.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => toggleColor(color)}
						aria-label={`Remove brick ${color} from tray`}
						title={color}
						{...stylex.props(styles.traySlot)}
					>
						<img
							src={renderBrick(color, 96)}
							alt={`Brick tile ${color}`}
							{...stylex.props(styles.brickImg, styles.trayImg)}
						/>
					</button>
				))}
				{EMPTY_SLOT_IDS.slice(count).map((slotId) => (
					<div key={slotId} {...stylex.props(styles.traySlotEmpty)} />
				))}
			</fieldset>
			{count < MIN_COLORS && (
				<p {...stylex.props(base.paragraph, styles.statusHint)}>
					Add at least {MIN_COLORS} tiles to continue.
				</p>
			)}
			{isFull && (
				<p {...stylex.props(base.paragraph, styles.statusHint)}>
					Tray full — remove a tile to add another.
				</p>
			)}

			<div {...stylex.props(styles.bin)}>
				{PRESET_PALETTES.map((palette, index) => (
					<div key={palette.name}>
						<div {...stylex.props(styles.groupHeader)}>
							<h4
								id={`brick-palette-${index}`}
								{...stylex.props(base.heading, base.h4, styles.groupLabel)}
							>
								{palette.name}
							</h4>
							<ActionButton
								type="button"
								onClick={() => loadPalette(index)}
								variant={activePalette === index ? "outline" : "secondary"}
								className={stylex.props(styles.compactButton).className}
							>
								Load
							</ActionButton>
						</div>
						<fieldset
							aria-labelledby={`brick-palette-${index}`}
							{...stylex.props(styles.groupReset, styles.cellRow)}
						>
							{palette.colors.map((color) => {
								const selected = hasColor(color);
								const blocked = isFull && !selected;
								return (
									<button
										key={color}
										type="button"
										onClick={() => toggleColor(color)}
										aria-pressed={selected}
										disabled={blocked}
										aria-label={
											selected ? `Remove brick ${color}` : `Add brick ${color}`
										}
										title={color}
										{...stylex.props(
											styles.brickCell,
											selected && styles.brickCellSelected,
										)}
									>
										<img
											src={renderBrick(color, 96)}
											alt=""
											{...stylex.props(styles.brickImg)}
										/>
										{selected && (
											<svg
												aria-hidden="true"
												viewBox="0 0 12 12"
												{...stylex.props(styles.checkBadge)}
											>
												<rect width="12" height="12" fill="#ffcf3f" />
												<path
													d="M2.5 6.5L5 9L9.5 3.5"
													stroke="#16130a"
													strokeWidth="2"
													fill="none"
												/>
											</svg>
										)}
									</button>
								);
							})}
						</fieldset>
					</div>
				))}

				{customSelected.length > 0 && (
					<div>
						<h4
							id="custom-brick-label"
							{...stylex.props(base.heading, base.h4, styles.groupLabel)}
						>
							Mine
						</h4>
						<fieldset
							aria-labelledby="custom-brick-label"
							{...stylex.props(styles.groupReset, styles.cellRow)}
						>
							{customSelected.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => toggleColor(color)}
									aria-pressed={true}
									aria-label={`Remove brick ${color}`}
									title={color}
									{...stylex.props(styles.brickCell, styles.brickCellSelected)}
								>
									<img
										src={renderBrick(color, 96)}
										alt=""
										{...stylex.props(styles.brickImg)}
									/>
									<svg
										aria-hidden="true"
										viewBox="0 0 12 12"
										{...stylex.props(styles.checkBadge)}
									>
										<rect width="12" height="12" fill="#ffcf3f" />
										<path
											d="M2.5 6.5L5 9L9.5 3.5"
											stroke="#16130a"
											strokeWidth="2"
											fill="none"
										/>
									</svg>
								</button>
							))}
						</fieldset>
					</div>
				)}
			</div>

			<div {...stylex.props(styles.groupHeader)}>
				<h4 {...stylex.props(base.heading, base.h4, styles.groupLabel)}>
					Custom
				</h4>
			</div>
			<div {...stylex.props(styles.customRow)}>
				<input
					type="color"
					value={customColor}
					onChange={(e) => setCustomColor(e.target.value)}
					aria-label="Select custom color"
					{...stylex.props(base.colorInput, base.focusOutline)}
				/>
				<div {...stylex.props(styles.customPreview)} aria-hidden="true">
					<img
						src={renderBrick(customColor, 96)}
						alt=""
						{...stylex.props(styles.brickImg)}
					/>
				</div>
				<ActionButton
					type="button"
					onClick={addCustomColor}
					disabled={hasColor(customColor) || isFull}
					variant="secondary"
				>
					{hasColor(customColor) ? "Already in tray" : "Add to tray"}
				</ActionButton>
			</div>
		</div>
	);
}

/** Pop for a brick landing in the tray; one authored moment, no scatter. */
const trayIn = stylex.keyframes({
	from: { transform: "scale(0.6)" },
	to: { transform: "scale(1)" },
});

const styles = stylex.create({
	/** Native fieldset chrome removed; the world draws its own keylines. */
	groupReset: {
		border: "none",
		margin: 0,
		padding: 0,
		minWidth: 0,
	},
	hint: {
		color: tokens.muted,
		fontSize: "0.875rem",
	},
	trayHeader: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: "0.5rem",
		marginTop: "1rem",
	},
	groupLabel: {
		fontFamily: "ui-monospace, monospace",
		fontSize: "0.75rem",
		fontWeight: 400,
		letterSpacing: "0.06em",
		textTransform: "uppercase",
		color: tokens.muted,
	},
	countReadout: {
		fontFamily: "ui-monospace, monospace",
		fontSize: "0.75rem",
		letterSpacing: "0.06em",
		fontVariantNumeric: "tabular-nums",
		color: tokens.info,
	},
	tray: {
		display: "flex",
		flexWrap: "wrap",
		gap: "0.25rem",
		margin: "0.5rem 0",
	},
	traySlotEmpty: {
		width: "2.75rem",
		height: "2.75rem",
		boxSizing: "border-box",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.gridline,
		backgroundColor: tokens.background,
	},
	traySlot: {
		appearance: "none",
		width: "2.75rem",
		height: "2.75rem",
		padding: 0,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		backgroundColor: tokens.surface,
		cursor: "pointer",
		":hover": { borderColor: tokens.invalid },
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
	},
	trayImg: {
		animation: `${trayIn} 0.14s ease-out`,
		[REDUCED_MOTION]: { animationDuration: "0.01ms" },
	},
	brickImg: {
		display: "block",
		width: "100%",
		height: "100%",
	},
	bin: {
		display: "flex",
		flexDirection: "column",
		gap: "1rem",
		marginTop: "1.5rem",
	},
	groupHeader: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: "0.5rem",
	},
	cellRow: {
		display: "flex",
		flexWrap: "wrap",
		gap: "0.25rem",
		marginTop: "0.5rem",
	},
	brickCell: {
		appearance: "none",
		position: "relative",
		width: "2.75rem",
		height: "2.75rem",
		padding: 0,
		boxSizing: "border-box",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		backgroundColor: tokens.surface,
		cursor: "pointer",
		transition: "border-color 0.1s ease",
		":hover": { backgroundColor: tokens.secondaryHover },
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		":disabled": { cursor: "not-allowed", opacity: 0.4 },
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	brickCellSelected: {
		borderColor: tokens.primary,
		":hover": { backgroundColor: tokens.surface },
	},
	checkBadge: {
		position: "absolute",
		top: 0,
		right: 0,
		width: "0.75rem",
		height: "0.75rem",
	},
	compactButton: {
		padding: "0.3rem 0.6rem",
		fontSize: "0.875rem",
		minWidth: 0,
	},
	statusHint: {
		color: tokens.muted,
		fontSize: "0.875rem",
	},
	customRow: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "0.5rem",
		marginTop: "0.5rem",
	},
	customPreview: {
		width: "2.75rem",
		height: "2.75rem",
		boxSizing: "border-box",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		backgroundColor: tokens.surface,
	},
});
