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
    
    // Parse the review result to extract type and feedback
    const reviewOutput = reviewResult.output;
    
    // Extract review type and feedback using regex
    const typeMatch = reviewOutput.match(/<review-type>(.*?)<\/review-type>/s);
    const feedbackMatch = reviewOutput.match(/<review-feedback>(.*?)<\/review-feedback>/s);
    
    const reviewType = typeMatch ? typeMatch[1].trim() as "approve" | "comment" | "request-changes" : "comment";
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : "No specific feedback provided.";
    
    console.log(`Review type: ${reviewType}`);
    console.log(`Review feedback: ${feedback}`);
    
    // Find the PR number for this branch
    const prNumber = await findPRForBranch(branch);
    
    if (prNumber) {
      // Post the review to the PR
      await postPRReview(feedback, prNumber, reviewType);
      console.log(`Posted ${reviewType} review to PR #${prNumber}`);
    } else {
      console.log(`No open PR found for branch ${branch}. Review feedback:\n${feedback}`);
    }
    }

    return {
        run
    }

}