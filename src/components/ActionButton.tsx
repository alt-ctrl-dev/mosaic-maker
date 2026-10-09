import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { tokens } from "../styles/tokens.stylex";

const styles = stylex.create({
	button: {
		appearance: "none",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: "transparent",
		borderRadius: tokens.radius,
		backgroundColor: {
			default: tokens.primary,
			":hover": tokens.primaryHover,
		},
		color: tokens.onPrimary,
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		font: "inherit",
		fontWeight: 600,
		lineHeight: 1.5,
		padding: "0.65rem 1rem",
		minWidth: "2.75rem",
		textAlign: "center",
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		":disabled": { cursor: "not-allowed", opacity: 0.5 },
	},
	secondary: {
		color: tokens.onSecondary,
		backgroundColor: {
			default: tokens.secondary,
			":hover": tokens.secondaryHover,
		},
	},
	outline: {
		borderColor: tokens.primary,
		backgroundColor: {
			default: "transparent",
			":hover": tokens.primarySoft,
		},
		color: tokens.primary,
	},
});

type Props = ComponentProps<"button"> & { variant?: "secondary" | "outline" };

/** Shared button chrome for workflow actions, preserving native button behavior. */
export function ActionButton({ className, variant, ...props }: Props) {
	const { className: stylexClass } = stylex.props(
		styles.button,
		variant === "secondary" && styles.secondary,
		variant === "outline" && styles.outline,
	);
	return (
		<button
			{...props}
			className={[className, stylexClass].filter(Boolean).join(" ")}
		/>
	);
}
