import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { tokens } from "../styles/tokens.stylex";

const styles = stylex.create({
	badge: {
		fontSize: "0.7rem",
		fontWeight: "bold",
		textTransform: "uppercase",
		letterSpacing: "0.06em",
		color: tokens.muted,
		backgroundColor: tokens.secondary,
		padding: "0.2rem 0.5rem",
		whiteSpace: "nowrap",
	},
});

/**
 * A small square tag for labeling status or scope (e.g. "(Optional)").
 * Deliberately borderless and flat so it reads as a label, never as a
 * control.
 */
export function Badge({ className, ...props }: ComponentProps<"span">) {
	const { className: stylexClass } = stylex.props(styles.badge);
	return (
		<span
			{...props}
			className={[className, stylexClass].filter(Boolean).join(" ")}
		/>
	);
}
