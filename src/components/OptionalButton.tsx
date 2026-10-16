import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { tokens } from "../styles/tokens.stylex";

const styles = stylex.create({
	button: {
		appearance: "none",
		backgroundColor: { default: "transparent", ":hover": tokens.surface },
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: { default: tokens.border, ":hover": tokens.muted },
		borderRadius: "999px",
		padding: "0.3rem 0.75rem",
		font: "inherit",
		fontSize: "0.8rem",
		color: { default: tokens.muted, ":hover": tokens.text },
		cursor: "pointer",
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		":disabled": { cursor: "not-allowed", opacity: 0.5 },
	},
});

/**
 * A quiet button for optional actions: small pill, hairline border, muted
 * color. For anything the user should notice second, after the primary
 * action on the page.
 */
export function OptionalButton({
	className,
	...props
}: ComponentProps<"button">) {
	const { className: stylexClass } = stylex.props(styles.button);
	return (
		<button
			{...props}
			className={[className, stylexClass].filter(Boolean).join(" ")}
		/>
	);
}
