import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens for the Pixel Sprite Grid world: a workbench field under a
 * faint construction grid, a strict five-color sprite palette, hard 1px
 * keylines and no shadows.
 *
 * Every color is a `light-dark()` pair, so the whole world follows the used
 * `color-scheme` on <html>: "light dark" (the shell default) tracks the OS,
 * and the footer toggle pins it to one scheme and saves the choice. Depth
 * stays three tonal steps in both schemes: field -> cell face -> chrome.
 *
 * Palette roles: gold = the one action color, teal = success/progress,
 * coral = alerts, blue = informational readouts. The light values deepen the
 * gold, teal and coral so each keeps at least 4.5:1 contrast on the field.
 */
export const tokens = stylex.defineVars({
	radius: 0,
	primary: "light-dark(#8a6100, #ffcf3f)",
	onPrimary: "light-dark(#fffdf5, #16130a)",
	onSecondary: "light-dark(#1b2130, #dfe4f2)",
	primaryHover: "light-dark(#6f4e00, #ffde70)",
	primarySoft: "light-dark(#fbf0d6, #2b2613)",
	secondary: "light-dark(#e3e6ee, #232939)",
	secondaryHover: "light-dark(#d5dae6, #2e374c)",
	text: "light-dark(#1b1e28, #e8eaf2)",
	muted: "light-dark(#5c6478, #9aa3b8)",
	border: "light-dark(#c9cedb, #2a3040)",
	surface: "light-dark(#fbfbfd, #1a1e2a)",
	background: "light-dark(#eceef3, #12141c)",
	shadow: "none",
	invalid: "light-dark(#cf1c3f, #ff5d73)",
	invalidSoft: "light-dark(#fde7ea, #2e1a22)",
	valid: "light-dark(#0b7a63, #3ec6a8)",
	info: "light-dark(#2f5fd0, #5b8cff)",
	/** Faint line color for the construction-grid field and overlays. */
	gridline: "light-dark(#dde1e9, #20263a)",
});
