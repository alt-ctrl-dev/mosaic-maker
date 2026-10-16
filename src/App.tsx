import * as stylex from "@stylexjs/stylex";
import { Provider, useAtomValue, useSetAtom } from "jotai";
import { flushSync } from "react-dom";
import {
	advanceFromSizeAtom,
	currentStepAtom,
	furthestCompletedStepAtom,
	goToStepAtom,
	modeAtom,
	rejectedTesseraCountAtom,
	tesseraeAtom,
	validTesseraCountAtom,
} from "./atoms/workflow-atoms";
import { ActionButton } from "./components/ActionButton";
import { AppFooter } from "./components/AppFooter";
import { BrickColorPicker } from "./components/BrickColorPicker";
import { Dialog } from "./components/Dialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ExportMosaic } from "./components/ExportMosaic";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { ModeSelection } from "./components/ModeSelection";
import { PickTiles } from "./components/PickTiles";
import { SelectionSummary } from "./components/SelectionSummary";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraReview } from "./components/TesseraReview";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { prefersReducedMotion } from "./engine/accessibility-utils";
import { WorkflowStep as WorkflowStepEnum } from "./engine/workflow-state";
import { base } from "./styles/base.stylex";
import { tokens } from "./styles/tokens.stylex";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const stages = [
	"Choose source image",
	"Pick tile size",
	"Pick tiles",
	"Generate and preview",
	"Export mosaic",
] as const;

/** Spinner keyframe for the step-content entrance. Local because StyleX
 * does not resolve imported keyframe bindings. */
/** Document with the optional View Transition API. */
type DocumentWithViewTransition = Document & {
	startViewTransition?: (callback: () => void) => void;
};

/**
 * Runs a step change inside a view transition when the browser supports
 * it and motion is allowed; otherwise updates directly.
 */
function navigateWithTransition(update: () => void): void {
	const doc = document as DocumentWithViewTransition;
	if (
		typeof doc.startViewTransition === "function" &&
		!prefersReducedMotion()
	) {
		doc.startViewTransition(() => {
			// The DOM must change inside the callback to form the snapshot pair.
			flushSync(update);
		});
	} else {
		update();
	}
}

const styles = stylex.create({
	// Shell chrome formerly provided by :root/body/base.css globals.
	root: {
		boxSizing: "border-box",
		colorScheme: "dark",
		fontFamily: "system-ui, sans-serif",
		fontSize: "100%",
		color: tokens.text,
		lineHeight: 1.5,
		paddingInline: "16px",
		marginInline: "auto",
		"@media (min-width: 80rem)": { maxWidth: "80rem" },
	},
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: "0.5rem 1rem",
		paddingBlock: "1.5rem 1rem",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: tokens.border,
		"@media (max-width: 576px)": {
			paddingBlockStart: "1rem",
		},
	},
	nameplate: {
		fontFamily: '"Press Start 2P", monospace',
		fontSize: "1.25rem",
		lineHeight: 1.4,
		letterSpacing: "0.02em",
		color: tokens.primary,
		margin: 0,
		textTransform: "uppercase",
	},
	privacyNote: {
		margin: 0,
		color: tokens.valid,
		fontFamily: "ui-monospace, monospace",
		fontSize: "0.75rem",
		letterSpacing: "0.06em",
		textTransform: "uppercase",
	},
	workflow: {
		display: "flex",
		flexDirection: "column",
		gap: "2rem",
		paddingBottom: "2rem",
	},
	// The mode switcher is a global setting above the workspace, not a step.
	modeBar: {
		display: "flex",
		justifyContent: "center",
		paddingBlock: "1rem",
	},
	stepsList: { listStyle: "none", padding: 0, margin: 0 },
	// Sprite-rack stage cells: hard keylines, square counters, no dimming.
	stepButton: {
		boxSizing: "border-box",
		display: "flex",
		alignItems: "center",
		width: "100%",
		textAlign: "left",
		padding: "0.75rem 1rem",
		marginBottom: "0.5rem",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
		cursor: "pointer",
		backgroundColor: {
			default: tokens.surface,
			":hover": tokens.secondaryHover,
		},
		color: tokens.text,
		font: "inherit",
		transition: "background-color 0.2s",
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		":disabled": {
			cursor: "not-allowed",
			backgroundColor: tokens.background,
			color: tokens.muted,
		},
		"@media (max-width: 900px)": { padding: "1rem" },
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	// The current stage takes a gold keyline and gold ink; the gold fill
	// stays reserved for the primary action plate.
	stepButtonCurrent: {
		backgroundColor: {
			default: tokens.surface,
			":hover": tokens.secondaryHover,
		},
		borderColor: tokens.primary,
		color: tokens.primary,
	},
	stepButtonCompleted: {
		borderColor: tokens.valid,
		color: tokens.valid,
	},

	stepIndicator: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: "1.75rem",
		height: "1.75rem",
		marginRight: "0.75rem",
		fontFamily: "ui-monospace, monospace",
		fontWeight: "bold",
		flexShrink: 0,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: "currentColor",
	},
	stepIndicatorCurrent: {
		color: tokens.primary,
	},
	stepTitle: {
		fontWeight: 500,
		"@media (max-width: 900px)": { fontSize: "1rem" },
	},
	canvas: { width: "100%", maxWidth: "48rem", marginInline: "auto" },
	content: { flex: 1, viewTransitionName: "step-content" },
	pickTiles: { display: "flex", flexDirection: "column", gap: "2rem" },
});

/**
 * Root application component for the Mosaic Maker workflow.
 */
export function App() {
	return (
		<Provider>
			<WorkflowApp />
		</Provider>
	);
}

/** Internal workflow component exported for testing. */
export function WorkflowApp() {
	const currentStep = useAtomValue(currentStepAtom);
	const furthestCompletedStep = useAtomValue(furthestCompletedStepAtom);
	const mode = useAtomValue(modeAtom);
	const tesserae = useAtomValue(tesseraeAtom);
	const validTesseraCount = useAtomValue(validTesseraCountAtom);
	const rejectedTesseraCount = useAtomValue(rejectedTesseraCountAtom);
	const goToStep = useSetAtom(goToStepAtom);
	const advanceFromSize = useSetAtom(advanceFromSizeAtom);

	function renderStepContent(stepIndex: number) {
		switch (stepIndex) {
			case WorkflowStepEnum.CHOOSE_SOURCE_IMAGE:
				return <SourceImageSelection />;
			case WorkflowStepEnum.PICK_TILE_SIZE:
				return (
					<div {...stylex.props(styles.pickTiles)}>
						<TesseraSizeSelection />
						<div>
							<ActionButton type="button" onClick={() => advanceFromSize()}>
								Continue to step 3 →
							</ActionButton>
						</div>
					</div>
				);
			case WorkflowStepEnum.PICK_TILES: {
				const isBrick = mode === "brick";
				const hasBrickColors = isBrick && tesserae.length >= 2;

				return (
					<div {...stylex.props(styles.pickTiles)}>
						{isBrick ? (
							<>
								<BrickColorPicker />
								{hasBrickColors && (
									<div>
										<div
											{...stylex.props(base.paragraph)}
											style={{ fontSize: "0.875rem" }}
										>
											{validTesseraCount} ready · {rejectedTesseraCount}{" "}
											rejected
										</div>
										<TesseraReview />
									</div>
								)}
							</>
						) : (
							<PickTiles />
						)}
					</div>
				);
			}
			case WorkflowStepEnum.GENERATE_AND_PREVIEW:
				return <GenerateAndPreview />;
			case WorkflowStepEnum.EXPORT_MOSAIC:
				return <ExportMosaic />;
			default:
				return <div>Step {stepIndex + 1} content coming soon</div>;
		}
	}

	// The rack is the navigation: no wizard counter or back/next chrome.

	// The tokens from defineVars are emitted on :root, so no theme class is
	// needed on the shell; it only carries the former :root/body globals.
	const rootProps = stylex.props(styles.root);

	return (
		<div {...rootProps} className={`layout-container ${rootProps.className}`}>
			<a href="#main-content" {...stylex.props(base.skipLink)}>
				Skip to main content
			</a>
			<header {...stylex.props(styles.header)}>
				<h1 {...stylex.props(styles.nameplate)}>Mosaic Maker</h1>
				<p {...stylex.props(styles.privacyNote)}>Private · in-browser</p>
			</header>

			<div {...stylex.props(styles.modeBar)}>
				<ModeSelection />
			</div>

			<SelectionSummary />

			<ErrorBoundary>
				<main id="main-content" {...stylex.props(styles.workflow)}>
					<Dialog
						dialogId="mobile-workflow-menu"
						ariaLabel="Toggle workflow steps"
					>
						<ol {...stylex.props(styles.stepsList)}>
							{stages.map((title, index) => {
								const isCurrent = currentStep === index;
								const isCompleted = index < furthestCompletedStep;
								const isDisabled = index > furthestCompletedStep;
								return (
									<li key={title}>
										<button
											type="button"
											{...stylex.props(
												styles.stepButton,
												isCurrent && styles.stepButtonCurrent,
												isCompleted && styles.stepButtonCompleted,
											)}
											aria-current={isCurrent ? "step" : undefined}
											onClick={() =>
												navigateWithTransition(() => goToStep(index))
											}
											disabled={isDisabled}
											commandfor="mobile-workflow-menu"
											command="close"
										>
											<span
												{...stylex.props(
													styles.stepIndicator,
													isCurrent && styles.stepIndicatorCurrent,
												)}
											>
												{isCompleted ? (
													<svg
														width="12"
														height="12"
														viewBox="0 0 12 12"
														aria-hidden="true"
													>
														<path
															d="M1.5 6.5 4.5 9.5 10.5 2.5"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
														/>
													</svg>
												) : (
													<span>{index + 1}</span>
												)}
											</span>
											<span {...stylex.props(styles.stepTitle)}>{title}</span>
										</button>
									</li>
								);
							})}
						</ol>
					</Dialog>

					<div {...stylex.props(styles.canvas)}>
						<div key={currentStep} {...stylex.props(styles.content)}>
							{renderStepContent(currentStep)}
						</div>
					</div>
				</main>
			</ErrorBoundary>
			<AppFooter />
		</div>
	);
}
