import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";

const styles = stylex.create({
	button: {
		appearance: "none",
		border: "1px solid transparent",
		borderRadius: "var(--radius)",
		backgroundColor: {
			default: "var(--primary)",
			":hover": "var(--primary-hover)",
		},
		color: "var(--on-primary)",
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
	},
	secondary: {
		color: "var(--on-secondary)",
		backgroundColor: {
			default: "var(--secondary)",
			":hover": "var(--secondary-hover)",
		},
	},
	outline: {
		borderColor: "var(--primary)",
		backgroundColor: {
			default: "transparent",
			":hover": "var(--primary-soft)",
		},
		color: "var(--primary)",
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
