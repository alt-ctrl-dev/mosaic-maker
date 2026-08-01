import { execSync } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";

const SANDBCASTLE_BRANCH_PATTERN = /^sandcastle\/issue-(\d+)$/;

const WORKTREES_DIR = resolve(process.cwd(), ".sandcastle/worktrees");

const LOGS_DIR = resolve(process.cwd(), ".sandcastle/logs");

type ClosedPR = { number: number; headRefName: string; state: string };

type ClosedIssue = { number: number; title: string; state: string };

/**
 * A worktree registered with git, as reported by `git worktree list`.
 *
 * `branch` is the short branch name checked out in the worktree, or null when
 * the worktree is detached or bare.
 */
export type RegisteredWorktree = { path: string; branch: string | null };

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
 * Lists worktrees registered with git by running `git worktree list --porcelain`.
 *
 * The main worktree is included; callers that only care about issue worktrees
 * should match against {@link WORKTREES_DIR}.
 */
const getRegisteredWorktrees = (): RegisteredWorktree[] => {
  try {
    const output = execSync("git worktree list --porcelain", { encoding: "utf-8" });
    return parseWorktreePorcelain(output);
  } catch (error) {
    console.error("Failed to list git worktrees:", error);
    return [];
  }
};

/**
 * Removes a git-registered worktree at the given path.
 *
 * Uses `--force` so worktrees with uncommitted changes or locks are still
 * removed, since the associated issue/PR is already closed.
 */
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
 * Returns null if the branch does not match the {@link SANDBCASTLE_BRANCH_PATTERN}.
 */
export const extractIssueNumberFromBranch = (branchName: string): number | null => {
  const match = branchName.match(SANDBCASTLE_BRANCH_PATTERN);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Warns about worktree directories under `.sandcastle/worktrees` that are not
 * registered with git (orphaned). These are intentionally left in place so the
 * bot never deletes directories git does not track.
 */
const warnAboutOrphanedWorktrees = (registeredPaths: Set<string>): void => {
  if (!existsSync(WORKTREES_DIR)) {
    return;
  }

  let entries: string[];
  try {
    entries = readdirSync(WORKTREES_DIR);
  } catch (error) {
    console.error(`✗ Failed to read worktrees directory ${WORKTREES_DIR}:`, error);
    return;
  }

  for (const entry of entries) {
    const entryPath = join(WORKTREES_DIR, entry);
    if (!registeredPaths.has(entryPath)) {
      console.warn(
        `⚠ Skipping orphaned worktree directory not registered with git: ${entryPath}`,
      );
    }
  }
};

/**
 * Removes local branches whose associated GitHub PRs or issues have been closed,
 * along with the git worktree and log files tied to closed sandcastle issues.
 *
 * Matches branches by exact PR head ref name, or by extracting the issue number
 * from sandcastle-style branch names ({@link SANDBCASTLE_BRANCH_PATTERN}).
 * Preserves the `main` branch and remote-tracking branches (`origin/*`).
 *
 * For a closed `sandcastle/issue-N` branch this also removes its registered
 * worktree (at `.sandcastle/worktrees/sandcastle-issue-N`) and deletes matching
 * `.sandcastle/logs/sandcastle-issue-N-*` files. Orphaned worktree directories
 * that git does not track are skipped with a warning.
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

  console.log("Listing git worktrees...");
  const worktrees = getRegisteredWorktrees();
  console.log(`Found ${worktrees.length} registered worktrees`);

  const worktreesByBranch = new Map<string, string>();
  const registeredWorktreePaths = new Set<string>();
  for (const worktree of worktrees) {
    registeredWorktreePaths.add(worktree.path);
    if (worktree.branch !== null) {
      worktreesByBranch.set(worktree.branch, worktree.path);
    }
  }

  warnAboutOrphanedWorktrees(registeredWorktreePaths);

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

    const issueNumber = extractIssueNumberFromBranch(branch);
    const matchesClosedPR = closedBranchNames.has(branch);
    const matchesClosedIssue = issueNumber !== null && closedIssueNumbers.has(issueNumber);

    if (!matchesClosedPR && !matchesClosedIssue) {
      continue;
    }

    if (matchesClosedPR) {
      console.log(`Found local branch ${branch} for closed PR`);
    } else {
      console.log(`Found local branch ${branch} for closed issue #${issueNumber}`);
    }

    const worktreePath = worktreesByBranch.get(branch);
    if (worktreePath !== undefined) {
      removeWorktree(worktreePath);
    }

    if (deleteLocalBranch(branch)) {
      deletedCount++;
    }

    if (issueNumber !== null) {
      deleteIssueLogs(issueNumber);
    }
  }

  console.log(`Cleanup completed. Deleted ${deletedCount} branches.`);
};
