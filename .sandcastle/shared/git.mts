import { spawnSync } from "child_process";

export const pushBranch = async (branchName: string): Promise<void> => {
  // Validate branch name to prevent shell injection
  if (!branchName || typeof branchName !== 'string') {
    throw new Error('Invalid branch name');
  }
  
  // Reject branch names that look like options
  if (branchName.startsWith('-')) {
    throw new Error('Branch name cannot start with hyphen');
  }
  
  try {
    const result = spawnSync('git', ['push', '--set-upstream', 'origin', branchName, '--force-with-lease'], { 
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