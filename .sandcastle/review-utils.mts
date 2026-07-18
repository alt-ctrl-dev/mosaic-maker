import { execSync } from "child_process";

/**
 * Posts a review to a GitHub PR
 * @param feedback The review feedback content
 * @param prNumber The PR number to post to
 * @param reviewType The type of review: "approve", "comment", or "request-changes"
 */
export const postPRReview = async (
  feedback: string,
  prNumber: string,
  reviewType: "approve" | "comment" | "request-changes"
): Promise<void> => {
  // Escape quotes in the feedback for shell command
  const escapedFeedback = feedback.replace(/"/g, '\\"');
  
  let command = `gh pr review ${prNumber}`;
  
  switch (reviewType) {
    case "approve":
      command += ` --approve -b "${escapedFeedback}"`;
      break;
    case "comment":
      command += ` --comment -b "${escapedFeedback}"`;
      break;
    case "request-changes":
      command += ` --request-changes -b "${escapedFeedback}"`;
      break;
    default:
      throw new Error(`Invalid review type: ${reviewType}`);
  }
  
  try {
    execSync(command, { stdio: "inherit" });
    console.log(`Successfully posted ${reviewType} review to PR #${prNumber}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to post review to PR #${prNumber}:`, message);
    throw error;
  }
};

/**
 * Finds the PR number for a given branch
 * @param branchName The branch name to find the PR for
 * @returns The PR number or null if no PR exists
 */
export const findPRForBranch = async (branchName: string): Promise<string | null> => {
  try {
    // Get the PR number for the branch
    const output = execSync(
      `gh pr list --head ${branchName} --state open --limit 1 --json number --jq '.[0].number'`,
      { encoding: "utf-8" }
    ).trim();
    
    return output ? output : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to find PR for branch ${branchName}:`, message);
    return null;
  }
};