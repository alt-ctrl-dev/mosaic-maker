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
import { sandboxEnv } from "./sandbox-env.mts";
import { createPlanAgent } from "./plan.mts";
import { createPr, generatePrDescription } from "./pr.mts";
import { createImplmentAgent } from "./implement.mts";
import { createReviewAgent } from "./review.mts";

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

import { execSync } from "child_process";





// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of implement→review cycles to run before stopping.
// Each cycle works on one issue. Raise this to process more issues per run.

// Maximum number of planning cycles before stopping when no commits are made.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);
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

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const planAgent = createPlanAgent(sandboxEnv)

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);
  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
  if (currentBranch !== "main") {
    throw new Error(`SandCastle must run from main branch. Current branch: ${currentBranch}`);
  }
  // pull latest changes
  execSync(
    `git pull`,
    { stdio: "inherit" }
  );

  // Plan work and identify the task to work on
  const topIssue = await planAgent.run()
  // Generate a branch name for this issue.
  const branch = topIssue.branch;

  // Create a single sandbox that both the implementer and reviewer share.
  // This gives both agents a real, named branch that persists across phases.
  const sandbox = await sandcastle.createSandbox({
    branch,
    sandbox: docker({ env: sandboxEnv }),
    hooks,
    copyToWorktree,
  });

  const implementAgent = createImplmentAgent(sandbox, topIssue)
  const reviewAgent = createReviewAgent(sandbox, branch)

  try {

    const commitLength = await implementAgent.run()

    if (!commitLength) {
      // No commits means the backlog is empty or every remaining issue is
      // blocked — there is nothing left to implement or review, so stop.
      console.log("Implementation agent made no commits. Stopping.");
      break;
    }

    console.log(`\nImplementation complete on branch: ${branch}`);

    await reviewAgent.run()
    console.log("\nReview complete.");



    const branchDetails = {
      current: topIssue.branch,
      base: "main"
    }
    const { title, description } = await generatePrDescription(sandboxEnv, topIssue.id, branchDetails)

    await createPr(title, description, branchDetails)
    console.log("\nCreated PR.");

  } finally {
    await sandbox.close();
  }
}

console.log("\nAll done.");



