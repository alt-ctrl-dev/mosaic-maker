import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens for the Pixel Sprite Grid world: a near-black workbench
 * field under a faint construction grid, a strict five-color sprite
 * palette, hard 1px keylines and no shadows. The world is dark by
 * commitment (imagery is judged against a dark field), so the values
 * carry no light/dark split.
 *
 * Palette roles: gold = the one action color, teal = success/progress,
 * coral = alerts, blue = informational readouts.
 */
export const tokens = stylex.defineVars({
	radius: 0,
	primary: "#ffcf3f",
	onPrimary: "#16130a",
	onSecondary: "#dfe4f2",
	primaryHover: "#ffde70",
	primarySoft: "#2b2613",
	secondary: "#232939",
	secondaryHover: "#2e374c",
	text: "#e8eaf2",
	muted: "#9aa3b8",
	border: "#2a3040",
	surface: "#1a1e2a",
	background: "#12141c",
	shadow: "none",
	invalid: "#ff5d73",
	invalidSoft: "#2e1a22",
	valid: "#3ec6a8",
	info: "#5b8cff",
	/** Faint line color for the construction-grid field and overlays. */
	gridline: "#20263a",
});
