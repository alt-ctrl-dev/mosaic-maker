import type React from "react";

export interface WorkflowStepProps {
	title: string;
	description: string;
	isCurrent?: boolean;
	stepNumber: number;
	children: React.ReactNode;
}

export function WorkflowStep({
	title,
	description,
	isCurrent = false,
	stepNumber,
	children,
}: WorkflowStepProps) {
	return (
		<article className={isCurrent ? "current-step" : ""}>
			<header>
				<span className="step-number" aria-hidden="true">
					{stepNumber}
				</span>
				<div>
					<h2>{title}</h2>
					<p>{description}</p>
				</div>
			</header>
			<section
				aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-section`}
			>
				{children}
			</section>
		</article>
	);
}
