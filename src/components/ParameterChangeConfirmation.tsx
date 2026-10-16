import * as stylex from "@stylexjs/stylex";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, type ReactNode } from "react";
import {
	parametersChangedAfterGenerationAtom,
	resetWorkflowAtom,
} from "../atoms/workflow-atoms";
import { base } from "../styles/base.stylex";
import { tokens } from "../styles/tokens.stylex";

const styles = stylex.create({
	backdrop: {
		position: "fixed",
		inset: 0,
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 1000,
	},
	dialog: {
		backgroundColor: tokens.surface,
		color: tokens.text,
		borderRadius: tokens.radius,
		border: `1px solid ${tokens.border}`,
		padding: "1.5rem",
		maxWidth: "25rem",
		width: "90vw",
		boxShadow: tokens.shadow,
	},
	title: {
		marginTop: 0,
		marginBottom: "1rem",
		fontSize: "1.25rem",
		fontWeight: "bold",
	},
	message: {
		marginBottom: "1.5rem",
		lineHeight: 1.5,
	},
	buttonGroup: {
		display: "flex",
		gap: "0.75rem",
		justifyContent: "flex-end",
	},
	button: {
		padding: "0.5rem 1rem",
		borderRadius: tokens.radius,
		border: "none",
		cursor: "pointer",
		fontWeight: "500",
		transition: "background-color 0.2s",
	},
	cancelButton: {
		backgroundColor: tokens.surface,
		color: tokens.text,
		border: `1px solid ${tokens.border}`,
		":hover": {
			backgroundColor: tokens.secondaryHover,
		},
	},
	confirmButton: {
		backgroundColor: tokens.primary,
		color: tokens.onPrimary,
		":hover": {
			backgroundColor: tokens.primaryHover,
		},
	},
});

interface ParameterChangeConfirmationProps {
	children: ReactNode;
	onConfirm: () => void;
	parameterName: string;
}

/**
 * Wrapper component that shows a confirmation dialog when parameters have
 * been changed after mosaic generation.
 */
export function ParameterChangeConfirmation({
	children,
	onConfirm,
	parameterName,
}: ParameterChangeConfirmationProps) {
	const parametersChanged = useAtomValue(parametersChangedAfterGenerationAtom);
	const resetWorkflow = useSetAtom(resetWorkflowAtom);
	const [showConfirmation, setShowConfirmation] = useState(false);

	const handleClick = () => {
		if (parametersChanged) {
			setShowConfirmation(true);
		} else {
			onConfirm();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			handleClick();
		}
	};

	const handleConfirmReset = () => {
		setShowConfirmation(false);
		resetWorkflow();
		onConfirm();
	};

	const handleCancel = () => {
		setShowConfirmation(false);
	};

	// Instead of wrapping children in a button, we'll just return the children
	// as-is and expect the parent to handle the event handlers
	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				style={{ all: "unset", display: "inline-block", cursor: "pointer" }}
			>
				{children}
			</button>

			{showConfirmation && (
				<div {...stylex.props(styles.backdrop)}>
					<div {...stylex.props(styles.dialog)}>
						<h2 {...stylex.props(styles.title)}>Reset Workflow?</h2>
						<p {...stylex.props(styles.message)}>
							You've already generated a mosaic. Changing the {parameterName}{" "}
							will reset your workflow and require you to start over.
						</p>
						<div {...stylex.props(styles.buttonGroup)}>
							<button
								type="button"
								{...stylex.props(
									styles.button,
									styles.cancelButton,
									base.focusOutline,
								)}
								onClick={handleCancel}
							>
								Cancel
							</button>
							<button
								type="button"
								{...stylex.props(
									styles.button,
									styles.confirmButton,
									base.focusOutline,
								)}
								onClick={handleConfirmReset}
							>
								Reset and Continue
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
