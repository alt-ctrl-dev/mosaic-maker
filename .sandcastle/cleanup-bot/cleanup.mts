import { execSync } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";

const SANDCASTLE_BRANCH_PATTERN = /^sandcastle\/issue-(\d+)$/;

const LOGS_DIR = resolve(process.cwd(), ".sandcastle/logs");

/**
 * A worktree registered with git, as reported by `git worktree list`.
 *
 * `branch` is the short branch name checked out in the worktree, or null when
 * the worktree is detached or bare.
 */
export type RegisteredWorktree = { path: string; branch: string | null };

const getLocalBranches = (): string[] => {
  try {
    const output = execSync("git branch --format='%(refname:short)'", { encoding: "utf-8" });
    const trimmed = output.trim();
    if (trimmed === "") {
      return [];
    }
    return trimmed.split("\n").map((branch) => branch.trim());
  } catch (error) {
    console.error("Failed to fetch local branches:", error);
    return [];
  }
};

/**
 * Reports whether the GitHub issue with the given number is closed.
 *
 * Queries a single issue via `gh issue view` rather than listing all closed
 * issues upfront. A failed query (e.g. the issue does not exist) is treated as
 * "not closed" so the branch is preserved.
 */
const isIssueClosed = (issueNumber: number): boolean => {
  try {
    const output = execSync(`gh issue view ${issueNumber} --json state`, { encoding: "utf-8" });
    const parsed: unknown = JSON.parse(output);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      typeof (parsed as Record<string, unknown>).state !== "string"
    ) {
      console.error(`Unexpected response shape from gh issue view ${issueNumber}`);
      return false;
    }
    return (parsed as { state: string }).state === "CLOSED";
  } catch (error) {
    console.error(`Failed to query issue #${issueNumber}:`, error);
    return false;
  }
};

/**
 * Reports whether the given branch is the head ref of a merged pull request.
 *
 * Queries `gh pr list --head <branch> --state merged` per-branch so arbitrary
 * (non-sandcastle) local branches can be matched to their merged PRs without
 * fetching every closed PR upfront. A failed query is treated as "no merged
 * PR" so the branch is preserved.
 */
const hasMergedPR = (branch: string): boolean => {
  try {
    const output = execSync(
      `gh pr list --head ${JSON.stringify(branch)} --state merged --json number`,
      { encoding: "utf-8" },
    );
    const parsed: unknown = JSON.parse(output);
    if (!Array.isArray(parsed)) {
      console.error(`Unexpected response shape from gh pr list for branch ${branch}`);
      return false;
    }
    return parsed.length > 0;
  } catch (error) {
    console.error(`Failed to query merged PRs for branch ${branch}:`, error);
    return false;
  }
};

/**
 * Parses the output of `git worktree list --porcelain` into structured
 * worktree records. Branch refs are normalized to short names (the
 * `refs/heads/` prefix is stripped); detached or bare worktrees yield a null
 * branch.
 */
export const parseWorktreePorcelain = (output: string): RegisteredWorktree[] => {
  const worktrees: RegisteredWorktree[] = [];
  let currentPath: string | null = null;
  let currentBranch: string | null = null;

  const flush = () => {
    if (currentPath !== null) {
      worktrees.push({ path: currentPath, branch: currentBranch });
    }
    currentPath = null;
    currentBranch = null;
  };

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      flush();
      currentPath = line.slice("worktree ".length).trim();
    } else if (line.startsWith("branch ")) {
      currentBranch = line.slice("branch ".length).trim().replace(/^refs\/heads\//, "");
    }
  }
  flush();

  return worktrees;
};

/**
 * Finds the path of the git worktree that has the given branch checked out, or
 * null when no registered worktree matches. Runs `git worktree list` on demand
 * for a single branch rather than precomputing a branch-to-worktree map.
 */
const findWorktreeForBranch = (branch: string): string | null => {
  try {
    const output = execSync("git worktree list --porcelain", { encoding: "utf-8" });
    const worktree = parseWorktreePorcelain(output).find((wt) => wt.branch === branch);
    return worktree ? worktree.path : null;
  } catch (error) {
    console.error(`Failed to list git worktrees for branch ${branch}:`, error);
    return null;
  }
};

const removeWorktree = (worktreePath: string): boolean => {
  try {
    execSync(`git worktree remove --force ${JSON.stringify(worktreePath)}`, { stdio: "inherit" });
    console.log(`✓ Removed worktree: ${worktreePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to remove worktree ${worktreePath}:`, error);
    return false;
  }
};

/**
 * Force-deletes a local branch with `git branch -D`.
 *
 * -D is used (instead of -d) so branches that are not fully merged are still
 * removed, since the associated issue/PR is already closed.
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
 * Deletes log files for a closed issue matching `sandcastle-issue-{number}-*`
 * in the sandcastle logs directory. Returns the number of files removed.
 */
const deleteIssueLogs = (issueNumber: number): number => {
  if (!existsSync(LOGS_DIR)) {
    return 0;
  }

  const prefix = `sandcastle-issue-${issueNumber}-`;
  let deletedCount = 0;

  try {
    for (const entry of readdirSync(LOGS_DIR)) {
      if (!entry.startsWith(prefix)) {
        continue;
      }
      const logPath = join(LOGS_DIR, entry);
      try {
        unlinkSync(logPath);
        console.log(`✓ Deleted log file: ${logPath}`);
        deletedCount++;
      } catch (error) {
        console.error(`✗ Failed to delete log file ${logPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`✗ Failed to read logs directory ${LOGS_DIR}:`, error);
  }

  return deletedCount;
};

/**
 * Extracts the issue number from a sandcastle branch name.
 * Returns null if the branch does not match the `sandcastle/issue-{number}` pattern.
 */
export const extractIssueNumberFromBranch = (branchName: string): number | null => {
  const match = branchName.match(SANDCASTLE_BRANCH_PATTERN);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Removes the worktree, logs, and the branch itself for a single branch that
 * has been determined to be cleanable. Worktree and log removal are performed
 * on demand here rather than precomputed. Returns true when the branch was
 * deleted.
 */
const cleanupBranch = (branch: string, issueNumber: number | null): boolean => {
  const worktreePath = findWorktreeForBranch(branch);
  if (worktreePath !== null) {
    removeWorktree(worktreePath);
  }

  if (issueNumber !== null) {
    deleteIssueLogs(issueNumber);
  }

  return deleteLocalBranch(branch);
};

/**
 * Removes local branches whose associated GitHub PRs or issues are closed,
 * along with the git worktree and log files tied to closed sandcastle issues.
 *
 * Iterates local branches and queries GitHub per-branch: `sandcastle/issue-N`
 * branches are cleaned when issue N is closed; other branches are cleaned when
 * they are the head ref of a merged pull request. Worktree and log cleanup are
 * performed on demand as part of each branch's removal.
 *
 * Preserves the `main` branch and remote-tracking branches (`origin/*`).
 */
export const cleanupClosedBranches = (): void => {
  console.log("Fetching local branches...");
  const localBranches = getLocalBranches();
  console.log(`Found ${localBranches.length} local branches`);

  let deletedCount = 0;

  for (const branch of localBranches) {
    if (branch === "main" || branch.startsWith("origin/")) {
      continue;
    }

    const issueNumber = extractIssueNumberFromBranch(branch);

    if (issueNumber !== null) {
      if (!isIssueClosed(issueNumber)) {
        continue;
      }
      console.log(`Found local branch ${branch} for closed issue #${issueNumber}`);
    } else {
      if (!hasMergedPR(branch)) {
        continue;
      }
      console.log(`Found local branch ${branch} for merged PR`);
    }

    if (cleanupBranch(branch, issueNumber)) {
      deletedCount++;
    }
  }

  console.log(`Cleanup completed. Deleted ${deletedCount} branches.`);
};
