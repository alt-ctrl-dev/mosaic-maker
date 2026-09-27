import * as sandcastle from "@ai-hero/sandcastle";
import { Agent } from "./types";

/**
 * Creates a review agent that inspects a branch's diff against the target
 * branch and either approves the changes or makes corrections directly on
 * the branch.
 */
export const createReviewAgent = (sandbox: sandcastle.Sandbox, branch: string): Agent<void> => {
    const agentName = "reviewer";

    const run = async () => {
        // -----------------------------------------------------------------------
        // Phase: Review
        //
        // A second sonnet agent reviews the diff of the branch produced by
        // Phase 1. It uses the {{BRANCH}} prompt argument to inspect the right
        // branch, and either approves or makes corrections directly on the branch.
        // -----------------------------------------------------------------------
        await sandbox.run({
            name: agentName,
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/deepseek/deepseek-v4-pro"),
            promptFile: "./.sandcastle/shared/review-prompt.md",
            promptArgs: {
                BRANCH: branch,
                TARGET_BRANCH: "main",
            },
            completionSignal: "<promise>COMPLETE</promise>",
        });
    };

    return {
        run,
    };
};