import React from "react";
import * as stylex from "@stylexjs/stylex";
import { base } from "../styles/base.stylex";
import { trackError } from "../telemetry";
import { ActionButton } from "./ActionButton";

const styles = stylex.create({
	boundary: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		minHeight: "100vh",
		gap: "1rem",
		padding: "2rem",
		textAlign: "center",
	},
});

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

/**
 * React error boundary that catches rendering errors and reports them to telemetry.
 * Provides a fallback UI when errors occur.
 */
export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_: Error): ErrorBoundaryState {
		// Update state so the next render shows the fallback UI
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		// Log the error to telemetry
		trackError("react_rendering", error, {
			componentStack: errorInfo.componentStack,
		});

		console.error("React rendering error:", error, errorInfo);
	}

	render(): React.ReactNode {
		if (this.state.hasError) {
			// Render fallback UI
			return (
				<div {...stylex.props(styles.boundary)}>
					<h2 {...stylex.props(base.heading, base.h2)}>
						Something went wrong.
					</h2>
					<p {...stylex.props(base.paragraph)}>
						We're sorry, but an unexpected error occurred. Please try refreshing
						the page.
					</p>
					<ActionButton
						type="button"
						onClick={() => {
							this.setState({ hasError: false });
							window.location.reload();
						}}
					>
						Refresh Page
					</ActionButton>
				</div>
			);
		}

		return this.props.children;
	}
}
