import { spawnSync } from "child_process";

/**
 * Pushes a branch to the remote origin with --force-with-lease for safe
 * force-pushing. Validates the branch name to prevent injection.
 */
export const pushBranch = async (branchName: string): Promise<void> => {
  if (!branchName || typeof branchName !== "string") {
    throw new Error("Invalid branch name");
  }

  if (branchName.startsWith("-")) {
    throw new Error("Branch name cannot start with hyphen");
  }

  try {
    const result = spawnSync("git", ["push", "--set-upstream", "origin", branchName, "--force-with-lease"], { 
      stdio: "inherit",
      encoding: "utf-8"
    });
    
    if (result.status !== 0) {
      throw new Error(`git push failed with exit code ${result.status}`);
    }
  } catch (error) {
    console.error(`Failed to push branch ${branchName}:`, error);
    throw error;
  }
};