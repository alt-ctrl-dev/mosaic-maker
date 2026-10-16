import * as stylex from "@stylexjs/stylex";
import { Provider, useAtomValue, useSetAtom } from "jotai";
import {
	advanceFromSizeAtom,
	currentStepAtom,
	modeAtom,
	rejectedTesseraCountAtom,
	tesseraeAtom,
	validTesseraCountAtom,
} from "./atoms/workflow-atoms";
import { ActionButton } from "./components/ActionButton";
import { AppFooter } from "./components/AppFooter";
import { BrickColorPicker } from "./components/BrickColorPicker";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GenerateAndPreview } from "./components/GenerateAndPreview";
import { IntroDialog } from "./components/IntroDialog";
import { ModeSelection } from "./components/ModeSelection";
import { PickTiles } from "./components/PickTiles";
import { SelectionSummary } from "./components/SelectionSummary";
import { SourceImageSelection } from "./components/SourceImageSelection";
import { TesseraReview } from "./components/TesseraReview";
import { TesseraSizeSelection } from "./components/TesseraSizeSelection";
import { WorkflowStep as WorkflowStepEnum } from "./engine/workflow-state";
import { base } from "./styles/base.stylex";
import { tokens } from "./styles/tokens.stylex";

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
	canvas: { width: "100%", maxWidth: "48rem", marginInline: "auto" },
	content: { flex: 1 },
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
	const mode = useAtomValue(modeAtom);
	const tesserae = useAtomValue(tesseraeAtom);
	const validTesseraCount = useAtomValue(validTesseraCountAtom);
	const rejectedTesseraCount = useAtomValue(rejectedTesseraCountAtom);
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
			default:
				return <div>Step {stepIndex + 1} content coming soon</div>;
		}
	}

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

			<IntroDialog />

			<div {...stylex.props(styles.modeBar)}>
				<ModeSelection />
			</div>

			<SelectionSummary />

			<ErrorBoundary>
				<main id="main-content" {...stylex.props(styles.workflow)}>
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
