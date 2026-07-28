import { execSync } from "child_process";

const SANDBCASTLE_BRANCH_PATTERN = /^sandcastle\/issue-(\d+)$/;

type ClosedPR = { number: number; headRefName: string; state: string };

type ClosedIssue = { number: number; title: string; state: string };

const getClosedPRs = (): ClosedPR[] => {
  try {
    const output = execSync(
      `gh pr list --state closed --limit 100 --json number,headRefName,state`,
      { encoding: "utf-8" },
    );
    return JSON.parse(output) as ClosedPR[];
  } catch (error) {
    console.error("Failed to fetch closed PRs:", error);
    return [];
  }
};

const getClosedIssues = (): ClosedIssue[] => {
  try {
    const output = execSync(
      `gh issue list --state closed --limit 50 --json number,title,state`,
      { encoding: "utf-8" },
    );
    return JSON.parse(output) as ClosedIssue[];
  } catch (error) {
    console.error("Failed to fetch closed issues:", error);
    return [];
  }
};

const getLocalBranches = (): string[] => {
  try {
    const output = execSync("git branch --format='%(refname:short)'", { encoding: "utf-8" });
    return output
      .trim()
      .split("\n")
      .map((branch) => branch.trim());
  } catch (error) {
    console.error("Failed to fetch local branches:", error);
    return [];
  }
};

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
 * Extracts the issue number from a sandcastle branch name.
 * Returns null if the branch does not match the {@link SANDBCASTLE_BRANCH_PATTERN}.
 */
export const extractIssueNumberFromBranch = (branchName: string): number | null => {
  const match = branchName.match(SANDBCASTLE_BRANCH_PATTERN);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Removes local branches whose associated GitHub PRs or issues have been closed.
 *
 * Matches branches by exact PR head ref name, or by extracting the issue number
 * from sandcastle-style branch names ({@link SANDBCASTLE_BRANCH_PATTERN}).
 * Preserves the `main` branch and remote-tracking branches (`origin/*`).
 */
export const cleanupClosedBranches = (): void => {
  console.log("Fetching closed PRs...");
  const closedPRs = getClosedPRs();
  console.log(`Found ${closedPRs.length} closed PRs`);

  console.log("Fetching closed issues...");
  const closedIssues = getClosedIssues();
  console.log(`Found ${closedIssues.length} closed issues`);

  console.log("Fetching local branches...");
  const localBranches = getLocalBranches();
  console.log(`Found ${localBranches.length} local branches`);

  if (localBranches.length === 0) {
    return;
  }

  const closedBranchNames = new Set(closedPRs.map((pr) => pr.headRefName));
  const closedIssueNumbers = new Set(closedIssues.map((issue) => issue.number));

  let deletedCount = 0;

  for (const branch of localBranches) {
    if (branch === "main" || branch.startsWith("origin/")) {
      continue;
    }

    if (closedBranchNames.has(branch)) {
      console.log(`Found local branch ${branch} for closed PR`);
      if (deleteLocalBranch(branch)) {
        deletedCount++;
      }
      continue;
    }

    const issueNumber = extractIssueNumberFromBranch(branch);
    if (issueNumber !== null && closedIssueNumbers.has(issueNumber)) {
      console.log(`Found local branch ${branch} for closed issue #${issueNumber}`);
      if (deleteLocalBranch(branch)) {
        deletedCount++;
      }
    }
  }

  console.log(`Cleanup completed. Deleted ${deletedCount} branches.`);
};