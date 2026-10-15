import { spawnSync } from "child_process";
import * as sandcastle from "@ai-hero/sandcastle";
import type { IsolatedDockerSandbox } from "../shared/isolated-docker.mts";
import { pushBranch } from "../shared/git.mts";
import fs from "node:fs";

const maybeAttachIssueId = (description: string, issueId: string | undefined) => {
  if (!issueId) {
    return description;
  }
  return `
${description}

## References

Closes #${issueId}
`;
};

/**
 * Generates a PR title and description by running two parallel sandbox agents
 * that inspect the diff between the current and base branches.
 */
export const generatePrDescription = async (
  sandbox: IsolatedDockerSandbox,
  issueId: string,
  branch: { base?: string; current: string },
) => {
  const baseBranch = branch.base ?? "main";
  const [prTitle, prDescription] = await Promise.all([
    sandcastle.run({
      sandbox,
      name: "pr-title-generator",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/sandcastle-bot/pr-title-prompt.md",
      promptArgs: { BRANCH: branch.current, BASE_BRANCH: baseBranch },
      output: sandcastle.Output.string({ tag: "pr-title" }),
    }),
    sandcastle.run({
      sandbox,
      name: "pr-description-generator",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/sandcastle-bot/pr-description-prompt.md",
      promptArgs: { BRANCH: branch.current, BASE_BRANCH: baseBranch },
      output: sandcastle.Output.string({ tag: "pr-description" }),
    }),
  ]);

  const description = maybeAttachIssueId(prDescription.output, issueId);

  return { title: prTitle.output, description };
};

/**
 * Creates a GitHub pull request for the given branch, pushing it first
 * and generating the PR via the GitHub CLI.
 */
export const createPr = async (
  title: string,
  description: string,
  branch: { base?: string; current: string },
) => {
  const prDescriptionFileName = "pr-description.md";
  const baseBranch = branch.base ?? "main";

  console.log("\n================ PR Title ================\n", title);
  console.log("\n============= PR Description =============\n", description);

  if (!title || typeof title !== "string") {
    throw new Error("Invalid PR title");
  }

  if (!branch.current || typeof branch.current !== "string") {
    throw new Error("Invalid branch name");
  }

  if (baseBranch && typeof baseBranch !== "string") {
    throw new Error("Invalid base branch name");
  }

  if (title.startsWith("-") || branch.current.startsWith("-") || baseBranch.startsWith("-")) {
    throw new Error("Inputs cannot start with hyphen");
  }

  try {
    await pushBranch(branch.current);

    fs.writeFileSync(prDescriptionFileName, description);

    const result = spawnSync(
      "gh",
      ["pr", "create", "--title", title, "--body-file", prDescriptionFileName, "--base", baseBranch, "--head", branch.current],
      { stdio: "inherit" },
    );

    if (result.status !== 0) {
      throw new Error(`gh pr create failed with exit code ${result.status}`);
    }

    console.log("Pull request created successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create pull request:", message);
    throw error;
  } finally {
    if (fs.existsSync(prDescriptionFileName)) {
      fs.rmSync(prDescriptionFileName);
    }
  }
};
