// Sequential Reviewer — implement-then-review loop
//
// This template drives a two-phase workflow per issue:
//   Phase 1 (Implement): A sonnet agent picks an open issue, works on it
//                        on a dedicated branch, commits the changes, and signals
//                        completion.
//   Phase 2 (Review):    A second sonnet agent reviews the branch diff and either
//                        approves it or makes corrections directly on the branch.
//
// Both phases share a single sandbox created via createSandbox(), so the
// implementer and reviewer work on the same explicit branch.
//
// The outer loop repeats up to MAX_ITERATIONS times, processing one issue per
// iteration and stopping early once the backlog is exhausted (an implement
// phase that produces no commits). This is a middle-complexity option between
// the simple-loop (no review gate) and the parallel-planner (concurrent
// execution with a planning phase).
//
// Usage:
//   npx tsx .sandcastle/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of implement→review cycles to run before stopping.
// Each cycle works on one issue. Raise this to process more issues per run.

// Maximum number of planning cycles before stopping when no commits are made.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = z.coerce.number().default(10).parse(process.env.MAX_ITERATIONS);
console.log(`Running for ${MAX_ITERATIONS} iteration(s)`);

// Hooks run inside the sandbox before the agent starts each iteration.
// npm install ensures the sandbox always has fresh dependencies.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "pnpm install" }] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full npm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToWorktree = ["node_modules"];

const sandboxEnv = {
  OPENROUTER_API_KEY:
    process.env.OPENROUTER_API_KEY ??
    (() => {
      throw new Error("OPENROUTER_API_KEY is required on host");
    })(),
};
// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // Generate a unique branch name for this iteration.
  const branch = `sandcastle/sequential-reviewer/${Date.now()}`;

  // Create a single sandbox that both the implementer and reviewer share.
  // This gives both agents a real, named branch that persists across phases.
  const sandbox = await sandcastle.createSandbox({
    branch,
    sandbox: docker({ env: sandboxEnv }),
    hooks,
    copyToWorktree,
  });

  try {
    // -----------------------------------------------------------------------
    // Phase 1: Implement
    //
    // A sonnet agent picks the next open issue, writes the
    // implementation (using RGR: Red → Green → Repeat → Refactor), and
    // commits the result.
    //
    // The agent signals completion via <promise>COMPLETE</promise> when done.
    // -----------------------------------------------------------------------
    // One iteration so each outer pass implements a single issue on its own
    // branch, then hands it to the reviewer. A higher value lets the agent
    // drain the whole backlog onto this one branch in a single pass, which
    // defeats the per-issue review.
    const implement = await sandbox.run({
      name: "implementer",
      maxIterations: 1,
      agent: sandcastle.pi("qwen/qwen3-coder"),
      promptFile: "./.sandcastle/implement-prompt.md",
    });

    console.log(`completionSignal = ${implement.completionSignal}`)

    if (!implement.commits.length) {
      // No commits means the backlog is empty or every remaining issue is
      // blocked — there is nothing left to implement or review, so stop.
      console.log("Implementation agent made no commits. Stopping.");
      break;
    }

    const issueId = 1;
    console.log(`\nImplementation complete on branch: ${branch}`);
    console.log(`Commits: ${implement.commits.length}`);

    // -----------------------------------------------------------------------
    // Phase 2: Review
    //
    // A second sonnet agent reviews the diff of the branch produced by
    // Phase 1. It uses the {{BRANCH}} prompt argument to inspect the right
    // branch, and either approves or makes corrections directly on the branch.
    // -----------------------------------------------------------------------
    await sandbox.run({
      name: "reviewer",
      maxIterations: 1,
      agent: sandcastle.pi("deepseek/deepseek-v4-pro"),
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: {
        BRANCH: branch,
      },
    });

    console.log("\nReview complete.");

    // -----------------------------------------------------------------------
    // Phase 3: Create Pull Request
    //
    // After review is complete, create a pull request for the branch.
    // This move the reviewed changes into a PR ready for merge.
    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // Phase 3: Generate PR Title and Description
    //
    // Use dedicated prompts to analyze commits and generate a structured
    // PR title and description based on the commits made.
    // -----------------------------------------------------------------------
    console.log("\nGenerating PR title and description...");

    console.log("\nGenerating PR title...\n");

    const prTitle = await sandcastle.run({
      sandbox: docker({ env: sandboxEnv }),
      name: "pr-title-generator",
      // One iteration is enough: the planner just needs to read and reason,
      // not write code. (Structured output requires maxIterations: 1.)
      maxIterations: 1,
      // Opus for planning: dependency analysis benefits from deeper reasoning.
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/pr-title.md",
      promptArgs: { BRANCH: branch, ISSUE_ID: issueId },
      // Extract and validate the <plan> output into a string. Throws
      // StructuredOutputError if the tag is missing, the output is malformed, or
      // validation fails — which aborts the loop.
      output: sandcastle.Output.string({ tag: "pr-title" }),
    });

    console.log("\n================ PR Title ================\n");
    console.log(prTitle.output);


    console.log("\nGenerating PR description...\n");
    const prDescription = await sandcastle.run({
      sandbox: docker({ env: sandboxEnv }),
      name: "pr-description-generator",
      // One iteration is enough: the planner just needs to read and reason,
      // not write code. (Structured output requires maxIterations: 1.)
      maxIterations: 1,
      // Opus for planning: dependency analysis benefits from deeper reasoning.
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/pr-description.md",
      promptArgs: { BRANCH: branch, ISSUE_ID: issueId },
      // Extract and validate the <pr-description> output into a string. Throws
      // StructuredOutputError if the tag is missing, the output is malformed, or
      // validation fails — which aborts the loop.
      output: sandcastle.Output.string({ tag: "pr-description" }),
    });

    console.log("\n============= PR Description =============\n");
    console.log(prDescription.output);

    console.log("PR title and description generated.");

    // -----------------------------------------------------------------------
    // Phase 4: Create Pull Request
    //
    // After title and description are generated, create the PR with
    // the generated content.
    // -----------------------------------------------------------------------
    console.log("\nCreating pull request...");
    // TODO create PR
    console.log("Pull request creation complete.");
  } finally {
    await sandbox.close();
  }
}

console.log("\nAll done.");
