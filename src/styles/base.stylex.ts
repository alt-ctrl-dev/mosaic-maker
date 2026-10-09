import * as stylex from "@stylexjs/stylex";
import { tokens } from "./tokens.stylex";

/** Media query for users who prefer reduced motion. Must stay a local
 * constant in every file: StyleX's compiler only resolves computed
 * conditional keys defined in the same module. */
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/** Spinner rotation used by busy status panels and the generation spinner. */
export const busySpin = stylex.keyframes({
	to: { transform: "rotate(360deg)" },
});

/**
 * Shared element styles, ported from the global rules in the old base.css and
 * the drop-zone styles shared between source image and tessera upload.
 */
export const base = stylex.create({
	heading: { margin: "0 0 1rem", lineHeight: 1.2 },
	h1: { fontSize: "2.5rem" },
	h2: { fontSize: "2rem" },
	h3: { fontSize: "1.5rem" },
	h4: { fontSize: "1.25rem" },
	paragraph: { margin: "0 0 1rem" },
	label: { fontWeight: 600 },
	legend: { fontWeight: 600, padding: 0 },
	fieldset: { border: 0, padding: 0, margin: "0 0 1rem", minWidth: 0 },
	/** Card chrome shared by status panels, alerts and review items. */
	card: {
		margin: "1rem 0",
		padding: "1.25rem",
		borderRadius: tokens.radius,
		backgroundColor: tokens.surface,
		boxShadow: tokens.shadow,
	},
	/** Spinner prefix for panels rendered while work is in flight (aria-busy). */
	busySpinner: {
		"::before": {
			content: '""',
			display: "inline-block",
			width: "1rem",
			height: "1rem",
			marginRight: "0.5rem",
			verticalAlign: "-0.15rem",
			border: "2px solid currentColor",
			borderRightColor: "transparent",
			borderRadius: "50%",
			animation: `${busySpin} 0.8s linear infinite`,
		},
		[REDUCED_MOTION]: {
			"::before": { animationDuration: "0.01ms", animationIterationCount: 1 },
		},
	},
	/** Text/number input and select chrome. */
	field: {
		boxSizing: "border-box",
		width: "100%",
		padding: "0.65rem 0.75rem",
		border: `1px solid ${tokens.border}`,
		borderRadius: tokens.radius,
		backgroundColor: tokens.surface,
		color: tokens.text,
	},
	colorInput: {
		boxSizing: "border-box",
		width: "2.75rem",
		height: "2.75rem",
		padding: "0.15rem",
		border: `1px solid ${tokens.border}`,
		borderRadius: tokens.radius,
		backgroundColor: tokens.surface,
		cursor: "pointer",
	},
	rangeInput: { width: "100%", accentColor: tokens.primary },
	accentPrimary: { accentColor: tokens.primary },
	srOnly: {
		position: "absolute",
		width: "1px",
		height: "1px",
		padding: 0,
		margin: "-1px",
		overflow: "hidden",
		clip: "rect(0, 0, 0, 0)",
		whiteSpace: "nowrap",
		border: 0,
	},
	skipLink: {
		position: "absolute",
		top: "-40px",
		left: "6px",
		zIndex: 1000,
		padding: "8px 12px",
		backgroundColor: tokens.primary,
		color: tokens.onPrimary,
		textDecoration: "none",
		borderRadius: tokens.radius,
		transition: "none",
		":focus": { top: "6px" },
	},
	focusOutline: {
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
	},
	disabledControl: { ":disabled": { cursor: "not-allowed", opacity: 0.5 } },
	details: {
		margin: "1rem 0",
		border: `1px solid ${tokens.border}`,
		borderRadius: tokens.radius,
	},
	summary: {
		padding: "0.75rem 1rem",
		cursor: "pointer",
		fontWeight: 600,
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
	},
	/** Drop zone shared by source image selection and tessera upload. */
	dropZone: {
		boxSizing: "border-box",
		width: "100%",
		height: "200px",
		border: `2px dashed ${tokens.border}`,
		borderRadius: tokens.radius,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		backgroundColor: tokens.surface,
		transition: "all 0.2s ease",
		cursor: "pointer",
		position: "relative",
		":hover": {
			borderColor: tokens.primary,
			backgroundColor: tokens.primarySoft,
		},
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	/** Drop zone highlight while uploads are being processed. */
	dropZoneActive: {
		borderColor: tokens.primary,
		backgroundColor: tokens.primarySoft,
	},
	fileInput: {
		position: "absolute",
		width: "100%",
		height: "100%",
		opacity: 0,
		cursor: "pointer",
	},
});
