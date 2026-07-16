import { Agent, Issue } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";

export const createReviewAgent = (sandbox: sandcastle.Sandbox, branch: string): Agent<void> => {

    const run = async () => {
    // -----------------------------------------------------------------------
    // Phase: Review
    //
    // A second sonnet agent reviews the diff of the branch produced by
    // Phase 1. It uses the {{BRANCH}} prompt argument to inspect the right
    // branch, and either approves or makes corrections directly on the branch.
    // -----------------------------------------------------------------------
    await sandbox.run({
      name: "reviewer",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/deepseek/deepseek-v4-pro"),
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: {
        BRANCH: branch,
      },
    });
    }

    return {
        run
    }

}