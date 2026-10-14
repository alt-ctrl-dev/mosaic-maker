import { spawnSync } from "child_process";
import { z } from "zod";

/**
 * Permission levels that are authorized to trigger bot execution
 * Based on GitHub repository permissions:
 * - admin: Can perform any action, including changing repository settings
 * - maintain: Can push to the repository and merge pull requests
 * - write: Can push to the repository but not merge pull requests
 */
export type AuthorizedPermission = "admin" | "maintain" | "write";

/**
 * Minimum permission level required to trigger bot execution
 */
export const MINIMUM_PERMISSION_LEVEL: AuthorizedPermission = "write";

/**
 * Checks if a user has the required permission level for the repository
 * 
 * @param username The GitHub username to check
 * @param requiredPermission The minimum permission level required
 * @returns true if the user has sufficient permissions, false otherwise
 */
export const hasRepositoryPermission = (
  username: string,
  requiredPermission: AuthorizedPermission = MINIMUM_PERMISSION_LEVEL
): boolean => {
  if (!username || typeof username !== "string") {
    console.error("Invalid username: " + username);
    return false;
  }

  // Prevent option injection
  if (username.startsWith("-")) {
    console.error("Username cannot start with hyphen: " + username);
    return false;
  }

  try {
    // Get user's permission level for the repository
    const result = spawnSync(
      "gh",
      ["api", "repos/{owner}/{repo}/collaborators/" + username + "/permission"],
      { encoding: "utf-8" }
    );

    if (result.status !== 0) {
      console.error("gh api failed with exit code " + result.status + ": " + (result.stderr || ""));
      return false; // Fail closed - deny execution on API failure
    }

    const output = result.stdout;
    const parsed: unknown = JSON.parse(output);
    
    if (parsed === null || typeof parsed !== "object") {
      console.error("Unexpected response shape from GitHub API");
      return false;
    }

    const permissionObj = parsed as Record<string, unknown>;
    const userPermission = permissionObj.permission;
    
    if (typeof userPermission !== "string") {
      console.error("Unexpected permission field in GitHub API response");
      return false;
    }

    // Check permission hierarchy
    const permissionHierarchy: Record<AuthorizedPermission, number> = {
      "write": 1,
      "maintain": 2,
      "admin": 3
    };

    const requiredLevel = permissionHierarchy[requiredPermission] || 1;
    const userLevel = permissionHierarchy[userPermission as AuthorizedPermission] || 0;

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error("Failed to check permission for user " + username + ":", error);
    return false; // Fail closed - deny execution on error
  }
};

/**
 * Validates that a user is authorized to trigger bot execution
 * 
 * @param username The GitHub username to validate
 * @returns true if the user is authorized, false otherwise
 */
export const isUserAuthorized = (username: string): boolean => {
  // Fail closed if username is invalid
  if (!username || typeof username !== "string") {
    console.error("Invalid username provided for authorization check");
    return false;
  }

  // Check if user has required repository permissions
  return hasRepositoryPermission(username, MINIMUM_PERMISSION_LEVEL);
};

/**
 * Checks if a pull request comes from a fork and requires explicit approval
 * 
 * @param prNumber The pull request number to check
 * @returns true if the PR is from a fork and requires approval, false otherwise
 */
export const requiresForkApproval = (prNumber: number): boolean => {
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.error("Invalid PR number: " + prNumber);
    return true; // Fail closed - assume fork requiring approval
  }

  try {
    const result = spawnSync(
      "gh",
      ["pr", "view", String(prNumber), "--json", "headRepositoryOwner,isCrossRepository"],
      { encoding: "utf-8" }
    );

    if (result.status !== 0) {
      console.error("gh pr view failed with exit code " + result.status + ": " + (result.stderr || ""));
      return true; // Fail closed - assume fork requiring approval
    }

    const output = result.stdout;
    const parsed: unknown = JSON.parse(output);
    
    if (parsed === null || typeof parsed !== "object") {
      console.error("Unexpected response shape from gh pr view");
      return true; // Fail closed - assume fork requiring approval
    }

    const prData = parsed as Record<string, unknown>;
    const isCrossRepository = prData.isCrossRepository;
    
    return Boolean(isCrossRepository);
  } catch (error) {
    console.error("Failed to check if PR " + prNumber + " is from a fork:", error);
    return true; // Fail closed - assume fork requiring approval
  }
};