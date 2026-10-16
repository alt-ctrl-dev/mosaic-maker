import * as stylex from "@stylexjs/stylex";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { introDismissedAtom } from "../atoms/ui-atoms";
import { tokens } from "../styles/tokens.stylex";
import { ActionButton } from "./ActionButton";

const styles = stylex.create({
	popover: {
		boxSizing: "border-box",
		width: "min(90vw, 26rem)",
		maxHeight: "80vh",
		margin: "auto",
		padding: "1.5rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		backgroundColor: tokens.surface,
		color: tokens.text,
		"::backdrop": { backgroundColor: "#0009" },
	},
	copy: {
		margin: 0,
		fontSize: "0.875rem",
		lineHeight: 1.5,
	},
	actions: {
		marginTop: "1rem",
	},
	closeButton: {
		display: "flex",
		width: "100%",
		gap: "0.5rem",
	},
});

/**
 * First-visit introduction: a dialog shown as a centered popover. Any
 * close path — the button, Escape, or a click outside — persists the
 * dismissal, so it shows once per browser.
 */
export function IntroDialog() {
	const [dismissed, setDismissed] = useAtom(introDismissedAtom);
	const dialogRef = useRef<HTMLDialogElement>(null);

	// Only a first visit opens the intro; never re-open after dismissal.
	// biome-ignore lint/correctness/useExhaustiveDependencies: dismissed only guards the first visit
	useEffect(() => {
		if (dismissed) return;
		const dialog = dialogRef.current;
		if (dialog && typeof dialog.showPopover === "function") {
			dialog.showPopover();
		}
	}, []);

	if (dismissed) {
		return null;
	}

	return (
		<dialog
			ref={dialogRef}
			popover="auto"
			aria-label="Welcome to Mosaic Maker"
			// Count every close, not just the button, as dismissed.
			onToggle={(event) => {
				if (!event.currentTarget.matches(":popover-open")) {
					setDismissed(true);
				}
			}}
			{...stylex.props(styles.popover)}
		>
			<p {...stylex.props(styles.copy)}>
				Mosaic Maker turns one photo into a mosaic built from small tiles:
				choose a source image, pick your tiles, then generate and download the
				full-resolution result. Everything runs in your browser — your photos
				never leave your device.
			</p>
			<div {...stylex.props(styles.actions)}>
				<ActionButton
					type="button"
					variant="secondary"
					onClick={() => setDismissed(true)}
					className={stylex.props(styles.closeButton).className}
				>
					<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
						<path
							d="M2 2L10 10M10 2L2 10"
							stroke="currentColor"
							strokeWidth="2"
							fill="none"
						/>
					</svg>
					Close
				</ActionButton>
			</div>
		</dialog>
	);
}
