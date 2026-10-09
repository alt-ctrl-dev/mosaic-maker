import * as stylex from "@stylexjs/stylex";
import { useState, type PropsWithChildren } from "react";
import { tokens } from "../styles/tokens.stylex";
import { trackEvent } from "../telemetry";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

type DialogProp = {
	ariaLabel: string;
	dialogId: string;
};

type DialogButtonProp = DialogProp & {
	command: "show-modal" | "close";
};

const styles = stylex.create({
	toggleButton: {
		display: "none",
		font: "inherit",
		transition: "transform 0.15s ease",
		":active": { transform: "scale(0.9)" },
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
		"@media (max-width: 900px)": {
			display: "block",
			position: "fixed",
			bottom: "1rem",
			right: "1rem",
			width: "3rem",
			height: "3rem",
			borderRadius: "50%",
			borderWidth: 0,
			backgroundColor: tokens.primary,
			zIndex: 1001,
			cursor: "pointer",
			boxShadow: tokens.shadow,
			padding: 0,
			lineHeight: 0,
		},
	},
	// ponytail: the old fade used `opacity` + `@starting-style` and
	// `display ... allow-discrete` transitions, which StyleX cannot express;
	// the dialog now shows and hides instantly on both open and close.
	// Restore the fade once StyleX supports those conditionals.
	dialog: {
		boxSizing: "border-box",
		width: "min(90vw, 30rem)",
		maxHeight: "80vh",
		padding: "1.5rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		borderRadius: tokens.radius,
		backgroundColor: tokens.surface,
		color: tokens.text,
		boxShadow: tokens.shadow,
		"::backdrop": { backgroundColor: "#0009" },
	},
	toggleLine: {
		transformBox: "fill-box",
		transformOrigin: "center",
		transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
		[REDUCED_MOTION]: { transition: "none" },
	},
	showLineTopOpen: { transform: "translateY(4px) rotate(45deg)" },
	showLineBottomOpen: { transform: "translateY(-4px) rotate(-45deg)" },
	closeLineTopClosed: { transform: "translateY(-4px) rotate(-45deg)" },
	closeLineBottomClosed: { transform: "translateY(4px) rotate(45deg)" },
});

const DialogButtonToggle = ({
	ariaLabel,
	dialogId,
	command,
	children,
}: PropsWithChildren<DialogButtonProp>) => (
	<button
		{...stylex.props(styles.toggleButton)}
		aria-label={ariaLabel}
		type="button"
		commandfor={dialogId}
		command={command}
		onClick={() => {
			trackEvent("mobile_workflow_menu_interaction", {
				action: command,
				dialogId,
			});
		}}
	>
		{children}
	</button>
);

export const Dialog = ({
	children,
	ariaLabel,
	dialogId,
}: PropsWithChildren<DialogProp>) => {
	// Drives the hamburger/X icon morph that the old CSS attached to
	// `body:has(dialog[open])`; the popover's toggle event keeps it in sync
	// with native opens/closes (Escape, outside click, command buttons).
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<DialogButtonToggle
				ariaLabel={ariaLabel}
				dialogId={dialogId}
				command="show-modal"
			>
				<svg
					role="img"
					width="50%"
					height="50%"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					stroke="#ffffff"
					aria-hidden="true"
				>
					<title>Show modal button icon</title>
					<path
						{...stylex.props(
							styles.toggleLine,
							isOpen && styles.showLineTopOpen,
						)}
						d="M3 8H21"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<path
						{...stylex.props(
							styles.toggleLine,
							isOpen && styles.showLineBottomOpen,
						)}
						d="M3 16H21"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</DialogButtonToggle>
			<dialog
				id={dialogId}
				popover="auto"
				{...stylex.props(styles.dialog)}
				onToggle={(event) => setIsOpen(event.currentTarget.open)}
			>
				{children}
				<DialogButtonToggle
					ariaLabel={ariaLabel}
					dialogId={dialogId}
					command="close"
				>
					<svg
						role="img"
						width="50%"
						height="50%"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						stroke="#ffffff"
						aria-hidden="true"
					>
						<title>Close modal button icon</title>
						<path
							{...stylex.props(
								styles.toggleLine,
								!isOpen && styles.closeLineTopClosed,
							)}
							d="M5.64 5.64L18.36 18.36"
							stroke="#fff"
							strokeWidth="2"
							strokeLinecap="round"
						/>
						<path
							{...stylex.props(
								styles.toggleLine,
								!isOpen && styles.closeLineBottomClosed,
							)}
							d="M5.64 18.36L18.36 5.64"
							stroke="#fff"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</DialogButtonToggle>
			</dialog>
		</>
	);
};
