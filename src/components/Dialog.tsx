import type { PropsWithChildren } from "react";
import { trackEvent } from "../telemetry";

type DialogProp = {
	ariaLabel: string;
	dialogId: string;
};

type DialogButtonProp = DialogProp & {
	command: "show-modal" | "close";
};

const DialogButtonToggle = ({
	ariaLabel,
	dialogId,
	command,
	children,
}: PropsWithChildren<DialogButtonProp>) => {
	const handleClick = () => {
		// Track mobile workflow menu interactions
		trackEvent("mobile_workflow_menu_interaction", {
			action: command,
			dialogId: dialogId,
		});

		const button = document.querySelector(
			`button[command="${command}"][commandfor="${dialogId}"]`,
		) as HTMLButtonElement | null;
		if (button) {
			button.setAttribute("command", command);
			button.setAttribute("commandfor", dialogId);
		}
	};

	return (
		<button
			className="workflow-sidebar-toggle-button"
			aria-label={ariaLabel}
			type="button"
			commandfor={dialogId}
			command={command}
			onClick={handleClick}
		>
			{children}
		</button>
	);
};

export const Dialog = ({
	children,
	ariaLabel,
	dialogId,
}: PropsWithChildren<DialogProp>) => {
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
						className="toggle-line toggle-line-top"
						d="M3 8H21"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
					<path
						className="toggle-line toggle-line-bottom"
						d="M3 16H21"
						stroke="#fff"
						strokeWidth="2"
						strokeLinecap="round"
					/>
				</svg>
			</DialogButtonToggle>
			<dialog id={dialogId} popover="auto">
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
							className="toggle-line toggle-line-top"
							d="M5.64 5.64L18.36 18.36"
							stroke="#fff"
							strokeWidth="2"
							strokeLinecap="round"
						/>
						<path
							className="toggle-line toggle-line-bottom"
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
