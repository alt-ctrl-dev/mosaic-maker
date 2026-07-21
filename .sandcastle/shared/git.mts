import { execSync } from "child_process";

export const pushBranch = async (branchName: string): Promise<void> => {
  try {
    execSync(`git push --set-upstream origin ${branchName} --force-with-lease `, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to push branch ${branchName}:`, error);
  }
};