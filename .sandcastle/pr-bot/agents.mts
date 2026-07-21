import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execSync } from "child_process";
import { sandboxEnv } from "../shared/sandbox-env.mts";
import type { Comment, PR, Thread, PlanAction } from "./types.mts";
import { BOT_REPLY_PREFIX, PLAN_SCHEMA } from "./types.mts";
import { findUnhandledSandcastleComments } from "./comments.mts";
import { extractLinkedIssueNumbers, getIssueContext, postComment } from "./github.mts";

// ---------------------------------------------------------------------------
// Sandcastle Agents
// ---------------------------------------------------------------------------

const runImplementAgent = (sandbox: sandcastle.Sandbox, pr: PR, changeRequest: string, context: string) => {
  return sandbox.run({
    name: "pr-implement-agent",
    agent: sandcastle.pi("openrouter/qwen/qwen3-coder"),
    promptFile: "./.sandcastle/pr-bot/implement-prompt.md",
    promptArgs: {
      PR_NUMBER: pr.number.toString(),
      PR_TITLE: pr.title,
      PR_BRANCH: pr.headRefName,
      CHANGE_REQUEST: changeRequest,
      CONTEXT: context
    },
    completionSignal: "<promise>COMPLETE</promise>"
  });
};

const runReviewAgent = (sandbox: sandcastle.Sandbox, pr: PR) => {
  return sandbox.run({
    name: "pr-review-agent",
    agent: sandcastle.pi("openrouter/deepseek/deepseek-v4-pro"),
    promptFile: "./.sandcastle/shared/review-prompt.md",
    promptArgs: { BRANCH: pr.headRefName },
    completionSignal: "<promise>COMPLETE</promise>"
  });
};

const pushBranch = async (branchName: string): Promise<void> => {
  try {
    execSync(
      `git push --set-upstream origin ${branchName}`,
      { stdio: "inherit" }
    );
  } catch (error) {
    console.error(`Failed to push branch ${branchName}:`, error);
  }
};

// ---------------------------------------------------------------------------
// Main Processing
// ---------------------------------------------------------------------------

export const processPRComments = async (pr: PR, comments: Comment[]): Promise<void> => {
  console.log(`Processing PR #${pr.number}: ${pr.title}`);

  const unhandledComments = findUnhandledSandcastleComments(comments);

  if (unhandledComments.length === 0) {
    console.log(`No unhandled /sandcastle comments on PR #${pr.number}`);
    return;
  }

  console.log(`Found ${unhandledComments.length} unhandled /sandcastle comments`);

  for (const comment of unhandledComments) {
    console.log(`Processing comment from ${comment.author}: ${comment.sandcastleCommand}`);

    const thread: Thread = {
      pr,
      comments: comments.filter(c =>
        new Date(c.createdAt) <= new Date(comment.createdAt)
      )
    };

    // Fetch linked issue context for the plan agent
    const linkedIssueNumbers = extractLinkedIssueNumbers(pr.body);
    const issueContext = linkedIssueNumbers
      .map(n => getIssueContext(n))
      .filter(Boolean)
      .join("\n");

    // Create plan agent to analyze the comment
    const planAgent = await sandcastle.run({
      sandbox: docker({ env: sandboxEnv }),
      name: "pr-plan-agent",
      maxIterations: 1,
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/pr-bot/plan-prompt.md",
      promptArgs: {
        THREAD_JSON: JSON.stringify(thread),
        ISSUE_CONTEXT: issueContext || "No linked issues found."
      },
      output: sandcastle.Output.object({ tag: "plan", schema: PLAN_SCHEMA }),
    });

    const plan = planAgent.output as PlanAction;

    if (plan.action === "needs-info") {
      const questionsList = plan.questions?.map(q => `- ${q}`).join("\n") || "";
      const response = `${BOT_REPLY_PREFIX}\n\nI need more information to process your request:\n\n${questionsList}`;
      await postComment(pr.number, response, comment);
      return
    }

    if (plan.action !== "implement") {
      return;
    }

    console.log(`Implementing: ${plan.summary}`);

    const sandbox = await sandcastle.createSandbox({
      branch: pr.headRefName,
      sandbox: docker({ env: sandboxEnv }),
      hooks: {
        sandbox: { onSandboxReady: [{ command: "pnpm install" }] },
      },
      copyToWorktree: ["node_modules"],
    });

    try {
      await runImplementAgent(sandbox, pr, comment.sandcastleCommand || "", plan.context || "");
      await runReviewAgent(sandbox, pr);

      const response = `${BOT_REPLY_PREFIX}\n\nI've implemented the requested change: ${plan.summary}`;
      await postComment(pr.number, response, comment);
      await pushBranch(pr.headRefName);
    } finally {
      await sandbox.close();
    }
  }
};