import { Agent, Issue } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";
import { postPRReview, findPRForBranch } from "./review-utils.mts";

export const createReviewAgent = (sandbox: sandcastle.Sandbox, branch: string): Agent<void> => {

    const run = async () => {
    // -----------------------------------------------------------------------
    // Phase: Review
    //
    // A second sonnet agent reviews the diff of the branch produced by
    // Phase 1. It uses the {{BRANCH}} prompt argument to inspect the right
    // branch, makes corrections directly on the branch, and then provides
    // structured feedback that can be posted to the PR.
    // -----------------------------------------------------------------------
    
    // First, let the agent make improvements to the code
    await sandbox.run({
      name: "reviewer-improvements",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/deepseek/deepseek-v4-pro"),
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: {
        BRANCH: branch,
        TARGET_BRANCH: "main"
      },
      completionSignal:  "<promise>COMPLETE</promise>"
    });
    
    // Then, get structured feedback from the review agent
    const reviewResult = await sandcastle.run({
      sandbox: sandbox,
      name: "reviewer-feedback",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/deepseek/deepseek-v4-pro"),
      promptFile: "./.sandcastle/review-prompt-generate-feedback.md",
      promptArgs: {
        BRANCH: branch,
        TARGET_BRANCH: "main"
      },
      output: sandcastle.Output.string({ tag: "review-result" }),
    });
    
    const reviewOutput = reviewResult.output;

    const typeMatch = reviewOutput.match(/<review-type>(.*?)<\/review-type>/s);
    const feedbackMatch = reviewOutput.match(/<review-feedback>(.*?)<\/review-feedback>/s);

    const rawType = typeMatch?.[1]?.trim() ?? "";
    const reviewType = ["approve", "comment", "request-changes"].includes(rawType)
      ? (rawType as "approve" | "comment" | "request-changes")
      : "comment";
    const feedback = feedbackMatch?.[1]?.trim() ?? "No specific feedback provided.";
    
    console.log(`Review type: ${reviewType}`);
    console.log(`Review feedback: ${feedback}`);
    
    const prNumber = await findPRForBranch(branch);

    if (prNumber) {
      await postPRReview(feedback, prNumber, reviewType);
    } else {
      console.log(`No open PR found for branch ${branch}. Review feedback:\n${feedback}`);
    }
    }

    return {
        run
    }

}