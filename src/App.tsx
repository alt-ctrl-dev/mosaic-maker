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
} from "./engine/workflow-state";
import { useWorkflowReducer } from "./hooks/useWorkflowReducer";
import { base } from "./styles/base.stylex";
import { tokens } from "./styles/tokens.stylex";
import { trackError } from "./telemetry";

// StyleX only resolves computed conditional keys defined in the same module.
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

const stages = [
	"Choose mode",
	"Choose source image",
	"Build tesserae",
	"Generate and preview",
	"Export mosaic",
] as const;

/** Fallback tessera size when no adjusted size has been calculated yet. */
const DEFAULT_TESSERA_SIZE = 16;

const styles = stylex.create({
	// Shell chrome formerly provided by :root/body/base.css globals.
	root: {
		colorScheme: "light dark",
		fontFamily: "system-ui, sans-serif",
		fontSize: "100%",
		backgroundColor: tokens.background,
		color: tokens.text,
		lineHeight: 1.5,
		paddingInline: "16px",
		marginInline: "auto",
		"@media (min-width: 80rem)": { maxWidth: "80rem" },
	},
	header: {
		paddingBlock: "4rem 2rem",
		textAlign: "center",
		"@media (max-width: 576px)": {
			paddingBlockStart: "2rem",
			textAlign: "left",
		},
	},
	tagline: { maxWidth: "40rem", marginInline: "auto" },
	eyebrow: {
		marginBottom: "0.5rem",
		color: tokens.primary,
		fontWeight: 700,
		letterSpacing: "0.08em",
		textTransform: "uppercase",
	},
	workflow: {
		display: "flex",
		gap: "2rem",
		"@media (max-width: 900px)": { flexDirection: "column" },
	},
	sidebar: {
		flex: "0 0 14rem",
		borderRight: `1px solid ${tokens.border}`,
		paddingRight: "1rem",
		"@media (max-width: 900px)": { display: "none" },
	},
	stepsList: { listStyle: "none", padding: 0, margin: 0 },
	stepButton: {
		boxSizing: "border-box",
		display: "flex",
		alignItems: "center",
		width: "100%",
		textAlign: "left",
		padding: "0.75rem 1rem",
		marginBottom: "0.5rem",
		border: "none",
		borderRadius: tokens.radius,
		cursor: "pointer",
		backgroundColor: {
			default: tokens.secondary,
			":hover": tokens.secondaryHover,
		},
		color: tokens.onSecondary,
		font: "inherit",
		transition: "background-color 0.2s",
		":focus-visible": {
			outline: "2px solid currentColor",
			outlineOffset: "2px",
		},
		":disabled": { cursor: "not-allowed", opacity: 0.5 },
		"@media (max-width: 900px)": { padding: "1rem" },
		[REDUCED_MOTION]: { transitionDuration: "0.01ms" },
	},
	// Current step keeps its primary color on hover (matches the old cascade).
	stepButtonCurrent: {
		backgroundColor: {
			default: tokens.primary,
			":hover": tokens.primary,
		},
		color: tokens.onPrimary,
	},
	stepButtonCompleted: { opacity: 0.55 },
	stepIndicator: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: "1.75rem",
		height: "1.75rem",
		borderRadius: "50%",
		marginRight: "0.75rem",
		fontWeight: "bold",
		flexShrink: 0,
	},
	stepIndicatorCurrent: {
		backgroundColor: tokens.onPrimary,
		color: tokens.primary,
	},
	stepTitle: {
		fontWeight: 500,
		"@media (max-width: 900px)": { fontSize: "1rem" },
	},
	canvas: { flex: 1, display: "flex", flexDirection: "column" },
	navigation: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "1rem",
		paddingBottom: 0,
		borderBottom: `1px solid ${tokens.border}`,
	},
	stepCounter: { color: tokens.muted, fontSize: "0.9rem" },
	content: { flex: 1 },
	buildTesserae: { display: "flex", flexDirection: "column", gap: "2rem" },
	tesseraInputs: {
		display: "flex",
		flexWrap: "wrap",
		gap: "2rem",
		alignItems: "flex-start",
		"@media (max-width: 768px)": { flexDirection: "column" },
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

function WorkflowApp() {
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
									/>
									<p>OR</p>
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
										Clear all tiles
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
							/>
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

	const canGoForward =
		workflowState.currentStep < workflowState.furthestCompletedStep;

	const showBackButton = workflowState.currentStep > 0;

	const showTopNextButton =
		canGoForward && workflowState.currentStep > WorkflowStepEnum.BUILD_TESSERAE;

	// The tokens from defineVars are emitted on :root, so no theme class is
	// needed on the shell; it only carries the former :root/body globals.
	const rootProps = stylex.props(styles.root);

	return (
		<div {...rootProps} className={`layout-container ${rootProps.className}`}>
			<a href="#main-content" {...stylex.props(base.skipLink)}>
				Skip to main content
			</a>
			<header {...stylex.props(styles.header)}>
				<p
					{...stylex.props(base.paragraph, styles.eyebrow)}
					className="eyebrow"
				>
					Private, in-browser image making • Works offline once loaded
				</p>
				<h1 {...stylex.props(base.heading, base.h1)}>Mosaic Maker</h1>
				<p {...stylex.props(base.paragraph, styles.tagline)}>
					Turn a source image into a full-resolution photomosaic. Your source
					image and tesserae stay on this device.
				</p>
			</header>

			<ErrorBoundary>
				<main id="main-content" {...stylex.props(styles.workflow)}>
					<Dialog
						dialogId="mobile-workflow-menu"
						ariaLabel="Toggle workflow steps"
					>
						<ol {...stylex.props(styles.stepsList)}>
							{stages.map((title, index) => {
								const isCurrent = workflowState.currentStep === index;
								const isCompleted = index < workflowState.currentStep;
								const isDisabled = index > workflowState.furthestCompletedStep;
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
												dispatch({ type: "goToStep", step: index })
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
													<span>✓</span>
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

					<aside {...stylex.props(styles.sidebar)} aria-label="Workflow steps">
						<ol {...stylex.props(styles.stepsList)}>
							{stages.map((title, index) => {
								const isCurrent = workflowState.currentStep === index;
								const isCompleted = index < workflowState.currentStep;
								const isDisabled = index > workflowState.furthestCompletedStep;
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
												dispatch({ type: "goToStep", step: index })
											}
											disabled={isDisabled}
										>
											<span
												{...stylex.props(
													styles.stepIndicator,
													isCurrent && styles.stepIndicatorCurrent,
												)}
											>
												{isCompleted ? (
													<span>✓</span>
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
					</aside>

					<div {...stylex.props(styles.canvas)}>
						<div {...stylex.props(styles.navigation)}>
							{showBackButton && (
								<ActionButton
									type="button"
									variant="secondary"
									onClick={() =>
										dispatch({
											type: "goToStep",
											step: workflowState.currentStep - 1,
										})
									}
								>
									← Back
								</ActionButton>
							)}
							<span {...stylex.props(styles.stepCounter)}>
								Step {workflowState.currentStep + 1} of {stages.length}
							</span>
							{showTopNextButton && (
								<ActionButton
									type="button"
									onClick={() =>
										dispatch({
											type: "goToStep",
											step: workflowState.currentStep + 1,
										})
									}
								>
									Next →
								</ActionButton>
							)}
						</div>

						<div {...stylex.props(styles.content)}>
							{renderStepContent(workflowState.currentStep)}
						</div>
					</div>
				</main>
			</ErrorBoundary>
			<AppFooter />
		</div>
	);
}
