import * as stylex from "@stylexjs/stylex";
import { Provider } from "jotai";
import { ActionButton } from "./components/ActionButton";
import { AppFooter } from "./components/AppFooter";
import { BrickColorPicker } from "./components/BrickColorPicker";
import { Dialog } from "./components/Dialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ExportMosaic } from "./components/ExportMosaic";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { GeneratedTesserae } from "./components/GeneratedTesserae";
import { ModeSelection } from "./components/ModeSelection";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraReview } from "./components/TesseraReview";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { TesseraUpload } from "./components/TesseraUpload";
import { resizeTesserae } from "./engine/tessera-processing";
import {
	generateSupplementedTesserae,
	WorkflowStep as WorkflowStepEnum,
	WORKFLOW_STEP_TITLES,
} from "./engine/workflow-state";
import { useWorkflowReducer } from "./hooks/useWorkflowReducer";
import { base } from "./styles/base.stylex";
import { tokens } from "./styles/tokens.stylex";
import { trackError } from "./telemetry";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/** Fallback tessera size when no adjusted size has been calculated yet. */
const DEFAULT_TESSERA_SIZE = 16;

/** Spinner keyframe for the step-content entrance. Local because StyleX
 * does not resolve imported keyframe bindings. */
const stepEnter = stylex.keyframes({
	from: { opacity: 0, transform: "translateY(8px)" },
	to: { opacity: 1, transform: "none" },
});

const styles = stylex.create({
	// Shell chrome formerly provided by :root/body/base.css globals.
	root: {
		boxSizing: "border-box",
		colorScheme: "dark",
		fontFamily: "system-ui, sans-serif",
		fontSize: "100%",
		backgroundColor: tokens.background,
		color: tokens.text,
		lineHeight: 1.5,
		paddingInline: "16px",
		marginInline: "auto",
		"@media (min-width: 80rem)": { maxWidth: "80rem" },
	},
	sourceThumbnailHeader: {
		display: "flex",
		alignItems: "center",
		gap: "0.75rem",
		marginTop: "0.75rem",
		justifyContent: "center",
		"@media (max-width: 900px)": { justifyContent: "flex-start" },
	},
	sourceThumbnailImage: {
		width: "40px",
		height: "40px",
		objectFit: "cover",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: tokens.border,
	},
	sourceThumbnailDimensions: {
		fontSize: "0.85rem",
		color: tokens.muted,
		fontVariantNumeric: "tabular-nums",
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
		gap: "2rem",
		"@media (max-width: 900px)": { flexDirection: "column" },
	},
	// The rack sits to the right of the canvas focal plane; the source
	// image and its construction grid lead the workspace.
	sidebar: {
		boxSizing: "border-box",
		flex: "0 0 14rem",
		order: 2,
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderLeftColor: tokens.border,
		paddingLeft: "1rem",
		"@media (max-width: 900px)": { display: "none" },
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
	canvas: { flex: 1, order: 1, display: "flex", flexDirection: "column" },
	content: { flex: 1 },
	// Replays whenever the step changes because the element is keyed by step.
	contentEnter: {
		animationName: stepEnter,
		animationDuration: "0.25s",
		animationTimingFunction: "ease-out",
		[REDUCED_MOTION]: { animationDuration: "0.01ms" },
	},
	buildTesserae: { display: "flex", flexDirection: "column", gap: "2rem" },
	tesseraInputs: {
		display: "flex",
		flexWrap: "wrap",
		gap: "2rem",
		alignItems: "flex-start",
		"@media (max-width: 768px)": { flexDirection: "column" },
	},
	divider: {
		alignSelf: "center",
		color: tokens.muted,
		fontWeight: "bold",
		fontSize: "0.875rem",
		textTransform: "uppercase",
		letterSpacing: "0.05em",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderLeftColor: tokens.border,
		paddingLeft: "1rem",
		margin: "0 1rem",
		"@media (max-width: 768px)": {
			borderLeftWidth: 0,
			borderLeftStyle: "none",
			borderTopWidth: "1px",
			borderTopStyle: "solid",
			borderTopColor: tokens.border,
			paddingLeft: 0,
			paddingTop: "1rem",
			margin: "1rem 0",
		},
	},
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

/**
 * Renders the ordered list of workflow step buttons.
 * @param isMobile - When true, adds `commandfor` and `command` attributes
 *   so the button closes the mobile workflow dialog on click.
 */
function WorkflowStepList({
	isMobile,
	dispatch,
	currentStep,
	furthestCompletedStep,
}: {
	isMobile?: boolean;
	dispatch: ReturnType<typeof useWorkflowReducer>[1];
	currentStep: number;
	furthestCompletedStep: number;
}) {
	return (
		<ol {...stylex.props(styles.stepsList)}>
			{WORKFLOW_STEP_TITLES.map((title, index) => {
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
							onClick={() => dispatch({ type: "goToStep", step: index })}
							disabled={isDisabled}
							{...(isMobile
								? {
										commandfor: "mobile-workflow-menu",
										command: "close",
									}
								: {})}
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
	);
}

/** Internal workflow component exported for testing. */
export function WorkflowApp() {
	const [workflowState, dispatch] = useWorkflowReducer();

	const resolvedTesseraSize =
		workflowState.adjustedTesseraSize ?? DEFAULT_TESSERA_SIZE;

	const handleAcceptSupplementation =
		workflowState.isLowVarietyCollection &&
		!workflowState.hasAcceptedSupplementation
			? async () => {
					const supplementedTesserae =
						await generateSupplementedTesserae(workflowState);
					dispatch({
						type: "tesseraeSupplemented",
						tesserae: supplementedTesserae,
					});
				}
			: undefined;

	async function handleSizeSelected(size: number) {
		dispatch({ type: "sizeSelected", size });

		if (workflowState.tesserae.length === 0) return;

		try {
			const resizedTesserae = await resizeTesserae(
				workflowState.tesserae,
				size,
			);
			dispatch({
				type: "tesseraeResized",
				tesserae: resizedTesserae,
			});
		} catch (error) {
			console.error("Error resizing tesserae:", error);
			trackError("tesserae_resize", error, {
				tesseraCount: workflowState.tesserae.length,
				targetSize: size,
			});
		}
	}

	function renderStepContent(stepIndex: number) {
		switch (stepIndex) {
			case WorkflowStepEnum.CHOOSE_MODE:
				return (
					<ModeSelection
						mode={workflowState.mode}
						onModeSelected={(mode) => dispatch({ type: "modeSelected", mode })}
						onContinue={() =>
							dispatch({
								type: "advanceFromMode",
							})
						}
					/>
				);
			case WorkflowStepEnum.CHOOSE_SOURCE_IMAGE:
				return (
					<SourceImageSelection
						onSourceSelected={(sourceImage) =>
							dispatch({ type: "sourceSelected", sourceImage })
						}
						onSourceError={(errorMessage) =>
							dispatch({ type: "sourceError", errorMessage })
						}
						initialState={workflowState}
					/>
				);
			case WorkflowStepEnum.BUILD_TESSERAE: {
				const isPhotomosaic = workflowState.mode === "photomosaic";
				const isBrick = workflowState.mode === "brick";
				const hasPhotomosaicTesserae =
					isPhotomosaic && workflowState.tesserae.length > 0;
				const hasBrickColors = isBrick && workflowState.tesserae.length >= 2;
				const canReview = hasPhotomosaicTesserae || hasBrickColors;

				return (
					<div {...stylex.props(styles.buildTesserae)}>
						<TesseraSizeSelection
							onSizeSelected={handleSizeSelected}
							initialState={workflowState}
						/>
						{isPhotomosaic && (
							<>
								<div {...stylex.props(styles.tesseraInputs)}>
									<TesseraUpload
										onTesseraeProcessed={(tesserae) =>
											dispatch({ type: "tesseraeProcessed", tesserae })
										}
										adjustedTesseraSize={resolvedTesseraSize}
										currentTesserae={workflowState.tesserae}
									/>
									<div {...stylex.props(styles.divider)}>OR</div>
									<GeneratedTesserae
										onTesseraeGenerated={(tesserae) =>
											dispatch({ type: "tesseraeGenerated", tesserae })
										}
										initialState={workflowState}
									/>
								</div>
								{hasPhotomosaicTesserae && (
									<ActionButton
										type="button"
										onClick={() => dispatch({ type: "clearAllTesserae" })}
										variant="secondary"
										style={{ marginBottom: "1rem" }}
									>
										Clear all tesserae
									</ActionButton>
								)}
							</>
						)}
						{isBrick && (
							<BrickColorPicker
								onTesseraeSelected={(tesserae) =>
									dispatch({ type: "tesseraeProcessed", tesserae })
								}
								initialColors={workflowState.tesserae
									.map((tessera) => tessera.color)
									.filter((color): color is string => color !== undefined)}
							/>
						)}
						{canReview && (
							<div>
								<div
									{...stylex.props(base.paragraph)}
									style={{ fontSize: "0.875rem" }}
								>
									{workflowState.tesserae.filter((t) => t.isValid).length} ready
									· {workflowState.tesserae.filter((t) => !t.isValid).length}{" "}
									rejected
								</div>
								<TesseraReview
									tesserae={workflowState.tesserae}
									onRemoveTessera={(index) =>
										dispatch({ type: "removeTessera", index })
									}
									onAcceptSupplementation={handleAcceptSupplementation}
									onContinue={() => dispatch({ type: "advanceFromReview" })}
									isLowVariety={workflowState.isLowVarietyCollection}
									varietyRecommendation={workflowState.varietyRecommendation}
									hasAcceptedSupplementation={
										workflowState.hasAcceptedSupplementation
									}
									open={workflowState.tesserae.some((t) => !t.isValid)}
								/>
							</div>
						)}
					</div>
				);
			}
			case WorkflowStepEnum.GENERATE_AND_PREVIEW:
				return <GenerateAndPreview state={workflowState} dispatch={dispatch} />;
			case WorkflowStepEnum.EXPORT_MOSAIC:
				return <ExportMosaic state={workflowState} dispatch={dispatch} />;
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
				{workflowState.sourceImage &&
					workflowState.currentStep > WorkflowStepEnum.CHOOSE_SOURCE_IMAGE && (
						<div {...stylex.props(styles.sourceThumbnailHeader)}>
							<img
								src={workflowState.sourceImage.url}
								alt="Source"
								{...stylex.props(styles.sourceThumbnailImage)}
							/>
							<span {...stylex.props(styles.sourceThumbnailDimensions)}>
								{workflowState.sourceImage.width} ×{" "}
								{workflowState.sourceImage.height} pixels
							</span>
						</div>
					)}
			</header>

			<ErrorBoundary>
				<main id="main-content" {...stylex.props(styles.workflow)}>
					<Dialog
						dialogId="mobile-workflow-menu"
						ariaLabel="Toggle workflow steps"
					>
						<WorkflowStepList
							isMobile
							dispatch={dispatch}
							currentStep={workflowState.currentStep}
							furthestCompletedStep={workflowState.furthestCompletedStep}
						/>
					</Dialog>

					<aside {...stylex.props(styles.sidebar)} aria-label="Workflow steps">
						<WorkflowStepList
							dispatch={dispatch}
							currentStep={workflowState.currentStep}
							furthestCompletedStep={workflowState.furthestCompletedStep}
						/>
					</aside>

					<div {...stylex.props(styles.canvas)}>

						<div
							key={workflowState.currentStep}
							{...stylex.props(styles.content, styles.contentEnter)}
						>
							{renderStepContent(workflowState.currentStep)}
						</div>
					</div>
				</main>
			</ErrorBoundary>
			<AppFooter />
		</div>
	);
}
