import * as stylex from "@stylexjs/stylex";

const DARK = "@media (prefers-color-scheme: dark)";

/**
 * Design tokens, replacing the `:root` custom properties from the old
 * base.css. Light values are the default; dark values apply under
 * `prefers-color-scheme: dark`.
 */
export const tokens = stylex.defineVars({
	radius: "0.75rem",
	primary: { default: "#0172ad", [DARK]: "#51b9f0" },
	onPrimary: { default: "#fff", [DARK]: "#121a25" },
	onSecondary: "#fff",
	primaryHover: { default: "#005b8c", [DARK]: "#87d0f4" },
	primarySoft: { default: "#e9f5fc", [DARK]: "#163950" },
	secondary: "#525f7a",
	secondaryHover: "#414d64",
	text: { default: "#243047", [DARK]: "#e7ebf3" },
	muted: { default: "#596579", [DARK]: "#aab7ca" },
	border: { default: "#d5dbe5", [DARK]: "#3c4859" },
	surface: { default: "#fff", [DARK]: "#202a39" },
	background: { default: "#f8fafc", [DARK]: "#121a25" },
	shadow: {
		default: "0 0.25rem 1rem #17223b1a",
		[DARK]: "0 0.25rem 1rem #0006",
	},
	invalid: { default: "#b42318", [DARK]: "#ed746a" },
	invalidSoft: { default: "#fff0ed", [DARK]: "#431f25" },
	valid: { default: "#16744b", [DARK]: "#60c493" },
});
