import { execSync } from "child_process";
import * as sandcastle from "@ai-hero/sandcastle";
import type { DockerSandbox } from "../shared/docker.mts";
import { pushBranch } from "../shared/git.mts";
import { hooks, copyToWorktree } from "../shared/config.mts";
import type { Comment, PR, Thread, PlanAction } from "./types.mts";
import { BOT_REPLY_PREFIX, PLAN_SCHEMA } from "./types.mts";
import { getIssueContext, postComment } from "./github.mts";
import { createReviewAgent } from "../shared/review.mts";
import { Agent } from "../shared/types";
import { z } from "zod";

type Deps = { dockerSandbox: DockerSandbox };


const extractIssueNumbersFromPR = (pr: PR): number[] => {
  const issueFromPRDescription = extractLinkedIssueNumbersFromPrDescription(pr.body);
  const match = pr.headRefName.match(/sandcastle\/issue-(\d+)/);
  if (!match) return issueFromPRDescription;
  const issueNumberFromBranch = parseInt(match[1], 10);
  return [...new Set([...issueFromPRDescription, issueNumberFromBranch])];
}

const extractLinkedIssueNumbersFromPrDescription = (body: string | null): number[] => {
  if (!body) return [];
  const pattern = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/gi;
  return [...new Set([...body.matchAll(pattern)].map(m => parseInt(m[1], 10)))];
};


// ---------------------------------------------------------------------------
// Sandcastle Agents
// ---------------------------------------------------------------------------

const createPrImplementorAgent = (sandbox: sandcastle.Sandbox, pr: PR, context: string): Agent<void> => {
  const run = async () => {
    await sandbox.run({
      name: "pr-implement-agent",
      agent: sandcastle.pi("openrouter/anthropic/claude-opus-4.8"),
      promptFile: "./.sandcastle/pr-bot/implement-prompt.md",
      promptArgs: {
        PR_NUMBER: pr.number.toString(),
        PR_TITLE: pr.title,
        PR_BRANCH: pr.headRefName,
        CONTEXT: context
      },
      completionSignal: "<promise>COMPLETE</promise>"
    })
  }
  return {
    run
  }
}

const markCommentAsDone = async (comment: Comment) => {
  const endpoint = comment.isReviewComment
    ? `repos/:owner/:repo/pulls/comments/${comment.id}/reactions`
    : `repos/:owner/:repo/issues/comments/${comment.id}/reactions`;
  execSync(`gh api "${endpoint}" -f content=rocket`, { encoding: "utf-8" });
}

// ---------------------------------------------------------------------------
// Main Processing
// ---------------------------------------------------------------------------

/** Process unhandled `/sandcastle` comments on a PR by analyzing them with a plan agent and then implementing approved changes. */
export const processPRComments = async (pr: PR, unhandledComments: Comment[], deps: Deps): Promise<void> => {
  console.log(`Processing PR #${pr.number}: ${pr.title}`);

  if (unhandledComments.length === 0) {
    console.log(`No unhandled /sandcastle comments on PR #${pr.number}`);
    return;
  }

  console.log(`Found ${unhandledComments.length} unhandled /sandcastle comments`);

  const thread: Thread = { pr, comments: unhandledComments };

  for (const comment of unhandledComments) {
    console.log(`Processing comment from ${comment.author}`);

    // Fetch linked issue context for the plan agent
    const linkedIssueNumbers = extractIssueNumbersFromPR(pr)
    const issueContext = linkedIssueNumbers
      .map(n => getIssueContext(n))
      .filter(Boolean)
      .join("\n");

    // Create plan agent to analyze the comment
    const planAgent = await sandcastle.run({
      sandbox: deps.dockerSandbox,
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

      await Promise.all([
        postComment(pr.number, response, comment), 
        markCommentAsDone(comment)
      ]);
      return
    }

    if (plan.action !== "implement") {
      return;
    }

    console.log(`Implementing: ${plan.summary}`);

    const sandbox = await sandcastle.createSandbox({
      branch: pr.headRefName,
      sandbox: deps.dockerSandbox,
      hooks,
      copyToWorktree,
    });

    const prImplementorAgent = createPrImplementorAgent(sandbox, pr, plan.context || "");

    const reviewAgent = createReviewAgent(sandbox, pr.headRefName);
    try {
      await prImplementorAgent.run()
      console.log("Waiting for implement agent output to flush before running review...")
      await sleep(5)
      await reviewAgent.run();
      
      console.log("Waiting for review agent output to flush before posting comment...")
      await sleep(5)
      const response = `${BOT_REPLY_PREFIX}\n\nI've implemented the requested change: ${plan.summary}`;
       await Promise.all([
        postComment(pr.number, response, comment), 
        markCommentAsDone(comment)
      ]);
      await pushBranch(pr.headRefName);
    } finally {
      await sandbox.close();
    }
  }
};

function sleep(timeInSeconds: number) {
  return new Promise((r)=>{
    setTimeout(r, timeInSeconds * 1000)
  })
}
