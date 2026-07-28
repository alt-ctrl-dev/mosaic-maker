import { execSync } from "child_process";

/**
 * Get all closed PRs (merged or closed) with their branch names
 */
const getClosedPRs = async (): Promise<Array<{ number: number; headRefName: string; state: string }>> => {
  try {
    const output = execSync(
      `gh pr list --state closed --limit 100 --json number,headRefName,state`,
      { encoding: "utf-8" }
    );
    return JSON.parse(output);
  } catch (error) {
    console.error("Failed to fetch closed PRs:", error);
    return [];
  }
};

/**
 * Get closed issues that might have associated branches
 */
const getClosedIssues = async (): Promise<Array<{ number: number; title: string; state: string }>> => {
  try {
    // Get recently closed issues that might have sandcastle branches
    const output = execSync(
      `gh issue list --state closed --limit 50 --json number,title,state`,
      { encoding: "utf-8" }
    );
    return JSON.parse(output);
  } catch (error) {
    console.error("Failed to fetch closed issues:", error);
    return [];
  }
};

/**
 * Extract issue numbers from branch names that follow the pattern sandcastle/issue-{number}
 */
const extractIssueNumberFromBranch = (branchName: string): number | null => {
  const match = branchName.match(/^sandcastle\/issue-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Get local git branches
 */
const getLocalBranches = (): string[] => {
  try {
    const output = execSync("git branch --format='%(refname:short)'", { encoding: "utf-8" });
    return output.trim().split('\n').map(branch => branch.trim());
  } catch (error) {
    console.error("Failed to fetch local branches:", error);
    return [];
  }
};

/**
 * Delete a local branch
 */
const deleteLocalBranch = (branchName: string): boolean => {
  try {
    execSync(`git branch -D ${branchName}`, { stdio: "inherit" });
    console.log(`✓ Deleted local branch: ${branchName}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to delete local branch ${branchName}:`, error);
    return false;
  }
};

/**
 * Main cleanup function
 */
export const cleanupClosedBranches = async (): Promise<void> => {
  console.log("Fetching closed PRs...");
  const closedPRs = await getClosedPRs();
  
  if (closedPRs.length === 0) {
    console.log("No closed PRs found.");
  } else {
    console.log(`Found ${closedPRs.length} closed PRs`);
  }

  console.log("Fetching closed issues...");
  const closedIssues = await getClosedIssues();
  
  if (closedIssues.length === 0) {
    console.log("No closed issues found.");
  } else {
    console.log(`Found ${closedIssues.length} closed issues`);
  }

  console.log("Fetching local branches...");
  const localBranches = getLocalBranches();
  
  if (localBranches.length === 0) {
    console.log("No local branches found.");
    return;
  }

  console.log(`Found ${localBranches.length} local branches`);

  // Create a set of closed branch names for efficient lookup
  const closedBranchNames = new Set(closedPRs.map(pr => pr.headRefName));
  
  // Create a set of closed issue numbers for sandcastle branches
  const closedIssueNumbers = new Set(closedIssues.map(issue => issue.number));
  
  let deletedCount = 0;
  
  // Check each local branch
  for (const branch of localBranches) {
    // Skip special branches
    if (branch === 'main' || branch.startsWith('origin/')) {
      continue;
    }
    
    // If this branch corresponds to a closed PR, delete it
    if (closedBranchNames.has(branch)) {
      console.log(`Found local branch ${branch} for closed PR`);
      if (deleteLocalBranch(branch)) {
        deletedCount++;
      }
      continue;
    }
    
    // Check if this is a sandcastle issue branch for a closed issue
    const issueNumber = extractIssueNumberFromBranch(branch);
    if (issueNumber && closedIssueNumbers.has(issueNumber)) {
      console.log(`Found local branch ${branch} for closed issue #${issueNumber}`);
      if (deleteLocalBranch(branch)) {
        deletedCount++;
      }
    }
  }
  
  console.log(`Cleanup completed. Deleted ${deletedCount} branches.`);
};