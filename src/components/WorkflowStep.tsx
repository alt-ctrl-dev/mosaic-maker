import { useId } from "react";
import type { ReactNode } from "react";

/** Props for {@link WorkflowStep}. */
export interface WorkflowStepProps {
	/** Display title for the step. */
	title: string;
	/** Description of what the user should do in this step. */
	description: string;
	/** 1-based position in the workflow. */
	stepNumber: number;
	/** Step-specific content rendered below the header. */
	children: ReactNode;
}

/**
 * Renders a single step in the mosaic workflow with a header and content area.
 */
export function WorkflowStep({
	title,
	description,
	stepNumber,
	children,
}: WorkflowStepProps) {
	const headingId = useId();

	return (
		<article>
			<header>
				<span className="step-number" aria-hidden="true">
					{stepNumber}
				</span>
				<div>
					<h2 id={headingId}>{title}</h2>
					<p>{description}</p>
				</div>
			</header>
			<section aria-labelledby={headingId}>{children}</section>
		</article>
	);
}
