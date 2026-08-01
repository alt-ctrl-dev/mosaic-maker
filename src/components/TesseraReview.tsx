import type { TesseraInfo } from "../engine/workflow-state";

/** Props for {@link TesseraReview}. */
interface TesseraReviewProps {
	/** Tesserae to display in the review grid. */
	tesserae: TesseraInfo[];
	/** Called when the user removes a tessera at the given index. */
	onRemoveTessera: (index: number) => void;
	/** Called when the user accepts supplementing with generated tesserae. */
	onAcceptSupplementation?: () => void;
	/** Called when the user wants to continue to the next step. */
	onContinue?: () => void;
	/** Whether the collection has low variety. */
	isLowVariety?: boolean;
	/** Recommended number of tesserae for adequate variety. */
	varietyRecommendation?: number | null;
	/** Whether the user has already accepted supplementation. */
	hasAcceptedSupplementation?: boolean;
}

/**
 * Displays the tessera collection for review with validity stats,
 * variety warnings, and per-tessera removal.
 */
export function TesseraReview({
	tesserae,
	onRemoveTessera,
	onAcceptSupplementation,
	onContinue,
	isLowVariety = false,
	varietyRecommendation = null,
	hasAcceptedSupplementation = false,
}: TesseraReviewProps) {
	const validCount = tesserae.filter((t) => t.isValid).length;
	const rejectedCount = tesserae.length - validCount;

	return (
		<div className="tessera-review">
			<div className="tesserae-info">
				<p>
					Valid: {validCount} | Rejected: {rejectedCount} | Total:{" "}
					{tesserae.length}
				</p>

				{isLowVariety && varietyRecommendation && (
					<div className="warning alert" role="alert">
						<p>
							Low variety: You have {validCount} tesserae, but{" "}
							{varietyRecommendation} are recommended.
						</p>
						{onAcceptSupplementation && !hasAcceptedSupplementation && (
							<button
								type="button"
								onClick={onAcceptSupplementation}
								className="outline"
							>
								Add Generated Tesserae
							</button>
						)}
					</div>
				)}
			</div>

			<div className="tesserae-grid">
				{tesserae.map((tessera, index) => (
					<div
						key={tessera.fileName}
						className={[
							"tessera-item card",
							!tessera.isValid && "invalid",
							tessera.isSupplemented && "supplemented",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{tessera.previewUrl && (
							<img
								src={tessera.previewUrl}
								alt={tessera.fileName}
								className="tessera-preview"
							/>
						)}
						<div className="tessera-details">
							<span className="tessera-name">{tessera.fileName}</span>
							{!tessera.isValid && tessera.error && (
								<span className="tessera-error secondary">{tessera.error}</span>
							)}
							{tessera.isSupplemented && (
								<span className="supplemented-label badge">Supplemented</span>
							)}
						</div>
						<button
							type="button"
							onClick={() => onRemoveTessera(index)}
							aria-label={`Remove ${tessera.fileName}`}
							className="outline"
						>
							Remove
						</button>
					</div>
				))}
			</div>

			{onContinue && (
				<div className="tessera-review-actions">
					<button
						type="button"
						onClick={onContinue}
						disabled={validCount === 0}
						className="primary"
					>
						Continue to Generate
					</button>
				</div>
			)}
		</div>
	);
}
