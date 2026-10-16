import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useId } from "react";
import { modeAtom, selectModeAtom } from "../atoms/workflow-atoms";
import type { MosaicMode } from "../engine/workflow-state";
import { tokens } from "../styles/tokens.stylex";

/** Display titles for each mosaic mode. */
const MODE_TITLES: Record<MosaicMode, string> = {
	photomosaic: "Photomosaic",
	brick: "Brick Style",
};

/** All available modes as a typed array for safe iteration. */
const MODES: MosaicMode[] = ["photomosaic", "brick"];

/** StyleX only resolves computed conditional keys defined in the same module. */
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/* Neumorphic palette: soft dual shadows need tonal headroom around the surface.
   Each value is a light-dark() pair so the groove reads in both schemes. */
const groove = "light-dark(#dfe3ec, #171b26)";
const thumb = tokens.secondary;
const darkShadow = "light-dark(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.5))";
const lightShadow =
	"light-dark(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.04))";

const styles = stylex.create({
	root: {
		display: "inline-flex",
		width: "100%",
		maxWidth: "24rem",
		gap: "0.25rem",
		padding: "0.375rem",
		backgroundColor: groove,
		borderRadius: "99rem",
		boxShadow: `inset 0.25rem 0.25rem 0.5rem ${darkShadow}, inset -0.25rem -0.25rem 0.5rem ${lightShadow}`,
	},
	option: {
		position: "relative",
		display: "inline-flex",
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: "0.5rem 1.25rem",
		borderRadius: "99rem",
		color: tokens.muted,
		fontSize: "0.875rem",
		fontWeight: 600,
		letterSpacing: "0.02em",
		cursor: "pointer",
		userSelect: "none",
		transition:
			"background-color 0.15s ease-out, color 0.15s ease-out, box-shadow 0.15s ease-out",
		":focus-within": {
			outline: `0.125rem solid ${tokens.primary}`,
			outlineOffset: "0.125rem",
		},
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	selected: {
		backgroundColor: thumb,
		color: tokens.text,
		boxShadow: `0.25rem 0.25rem 0.5rem ${darkShadow}, -0.25rem -0.25rem 0.5rem ${lightShadow}`,
	},
	input: {
		position: "absolute",
		opacity: 0,
		width: "0.0625rem",
		height: "0.0625rem",
		margin: 0,
		pointerEvents: "none",
	},
});

/**
 * Neumorphic switcher above the workspace that selects the mosaic mode.
 * Mode is a global setting, not a workflow step: the workflow starts at
 * source image selection.
 */
export function ModeSelection() {
	const mode = useAtomValue(modeAtom);
	const selectMode = useSetAtom(selectModeAtom);
	// Instance-unique group name: radios sharing a name across mounted
	// instances would uncheck each other.
	const groupName = useId();
	return (
		<div
			role="radiogroup"
			aria-label="Mosaic style"
			{...stylex.props(styles.root)}
		>
			{MODES.map((modeValue) => {
				const title = MODE_TITLES[modeValue];
				const isSelected = mode === modeValue;
				return (
					<label
						key={modeValue}
						{...stylex.props(styles.option, isSelected && styles.selected)}
					>
						<input
							type="radio"
							name={`mosaic-mode-${groupName}`}
							checked={isSelected}
							onChange={() => selectMode(modeValue)}
							aria-label={`Select ${title} mode`}
							{...stylex.props(styles.input)}
						/>
						{title}
					</label>
				);
			})}
		</div>
	);
}
