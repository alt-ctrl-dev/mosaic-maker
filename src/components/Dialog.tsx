import type { PropsWithChildren } from "react";

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
}: PropsWithChildren<DialogButtonProp>) => (
	<button
		className="workflow-sidebar-toggle-button"
		aria-label={ariaLabel}
		type="button"
		commandfor={dialogId}
		command={command}
	>
		{children}
	</button>
);

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
					viewBox="-0.5 0 25 25"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					stroke="#ffffff"
				>
					<title>Show modal utton icon</title>
					<g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
					<g
						id="SVGRepo_tracerCarrier"
						strokeLinecap="round"
						strokeLinejoin="round"
					></g>
					<g id="SVGRepo_iconCarrier">
						<path
							d="M2 12.32H22"
							stroke="#fff"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						></path>
						<path
							d="M2 18.32H22"
							stroke="#fff"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						></path>
						<path
							d="M2 6.32001H22"
							stroke="#fff"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						></path>
					</g>
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
						viewBox="0 0 25.00 25.00"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						stroke="#ffffff"
					>
						<title>Close modal button icon</title>
						<g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
						<g
							id="SVGRepo_tracerCarrier"
							strokeLinecap="round"
							strokeLinejoin="round"
						></g>
						<g id="SVGRepo_iconCarrier">
							<path
								d="M3 21.32L21 3.32001"
								stroke="#fff"
								strokeWidth="2.25"
								strokeLinecap="round"
								strokeLinejoin="round"
							></path>
							<path
								d="M3 3.32001L21 21.32"
								stroke="#fff"
								strokeWidth="2.25"
								strokeLinecap="round"
								strokeLinejoin="round"
							></path>
						</g>
					</svg>
				</DialogButtonToggle>
			</dialog>
		</>
	);
};
