// Parallel Planner with Review — pull request orchestration loop
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):             An opus agent analyzes open issues, builds a
//                               dependency graph, and outputs a <plan> JSON
//                               listing unblocked issues with branch names.
//   Phase 2 (Execute + Review): For each issue, a sandbox is created via
//                               createSandbox(). The implementer runs first
//                               (100 iterations). If it produces commits, a
//                               reviewer runs in the same sandbox on the same
//                               branch (1 iteration). All issue pipelines run
//                               concurrently via Promise.allSettled().
//   Phase 3 (Publish):          Completed branches are pushed and opened as
//                               GitHub pull requests against main.
//
// The run stops after publishing so merges happen only through GitHub. Run it
// again after those pull requests merge to pick up newly unblocked issues.
//
// Usage:
//   npx tsx .sandcastle/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execFileSync, spawnSync } from "node:child_process";
import { z } from "zod";

// Publishing runs on the host rather than inside a Sandcastle agent, so load
// GH_TOKEN here for the GitHub CLI as well as the provider credentials.
process.loadEnvFile(".sandcastle/.env");

const sandboxEnv = {
  OPENROUTER_API_KEY:
    process.env.OPENROUTER_API_KEY ??
    (() => {
      throw new Error("OPENROUTER_API_KEY is required on host");
    })(),
};

// New sandbox branches must start from the latest main, not whichever branch
// happened to be checked out when this workflow was launched.
const hasLocalChanges = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
}).length > 0;

if (hasLocalChanges) {
  execFileSync("git", ["stash", "push", "--include-untracked"], {
    stdio: "inherit",
  });
}

execFileSync("git", ["switch", "main"], { stdio: "inherit" });
execFileSync("git", ["pull", "--ff-only", "origin", "main"], {
  stdio: "inherit",
});

if (hasLocalChanges) {
  execFileSync("git", ["stash", "pop"], { stdio: "inherit" });
}

// The planner emits its plan as JSON inside <plan> tags; Output.object extracts
// and validates it against this schema. We use Zod here, but any Standard
// Schema validator works just as well — Valibot, ArkType, etc. See
// https://standardschema.dev.
const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum number of planning cycles before stopping when no commits are made.
// Raise this if your backlog is large; lower it for a quick smoke-test run.
const MAX_ITERATIONS = 10;

// Hooks run inside the sandbox before the agent starts each iteration.
// pnpm install ensures the sandbox always has fresh dependencies.
const hooks = {
  sandbox: { onSandboxReady: [{ command: "pnpm install" }] },
};

// Copy node_modules from the host into the worktree before each sandbox
// starts. Avoids a full pnpm install from scratch; the hook above handles
// platform-specific binaries and any packages added since the last copy.
const copyToWorktree = ["node_modules"];

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent (opus, for deeper reasoning) reads the open issue list,
  // builds a dependency graph, and selects the issues that can be worked in
  // parallel right now (i.e., no blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — Output.object parses and validates it.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    sandbox: docker({ env: sandboxEnv }),
    name: "planner",
    // One iteration is enough: the planner just needs to read and reason,
    // not write code. (Structured output requires maxIterations: 1.)
    maxIterations: 1,
    // Opus for planning: dependency analysis benefits from deeper reasoning.
    agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
    promptFile: "./.sandcastle/plan-prompt.md",
    // Extract and validate the <plan> JSON into a typed object. Throws
    // StructuredOutputError if the tag is missing, the JSON is malformed, or
    // validation fails — which aborts the loop.
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });

  const issues = plan.output.issues;

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review
  //
  // For each issue, create a sandbox via createSandbox() so the implementer
  // and reviewer share the same sandbox instance per branch. The implementer
  // runs first; if it produces commits, the reviewer runs in the same sandbox.
  //
  // Promise.allSettled means one failing pipeline doesn't cancel the others.
  // -------------------------------------------------------------------------

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker({ env: sandboxEnv }),
        hooks,
        copyToWorktree,
      });

      try {
        // Run the implementer
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.pi("openrouter/qwen/qwen3-coder"),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        // Only review if the implementer produced commits
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/anthropic/claude-sonnet-4-6"),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });

          // Combine commits from both runs so the publish phase sees all of them.
          // Each sandbox.run() only returns commits from its own run.
          return {
            ...review,
            commits: [...implement.commits, ...review.commits],
          };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only publish branches that actually produced commits.
  // An agent that ran successfully but made no commits has nothing to publish.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    // All agents ran but none made commits — nothing to publish this cycle.
    console.log("No commits produced. Nothing to publish.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Publish pull requests
  //
  // This replaces the old merge agent. Completed work remains isolated on its
  // issue branch; GitHub owns CI, review, and the eventual merge into main.
  // -------------------------------------------------------------------------

  for (const issue of completedIssues) {
    // Push the reviewed branch without changing or merging the host branch.
    execFileSync(
      "git",
      ["push", "--set-upstream", "origin", issue.branch],
      { stdio: "inherit" },
    );

    // A rerun may encounter a branch whose PR was already created. Treat that
    // as success instead of creating a duplicate pull request.
    const existing = spawnSync(
      "gh",
      ["pr", "view", issue.branch, "--json", "url", "--jq", ".url"],
      { stdio: "inherit" },
    );

    if (existing.status !== 0) {
      execFileSync(
        "gh",
        [
          "pr",
          "create",
          "--base",
          "main",
          "--head",
          issue.branch,
          "--title",
          issue.title,
          "--body",
          // GitHub closes the issue only after this PR is merged.
          `## Summary\n\nCloses #${issue.id}\n\n## Verification\n\n- [ ] Tests pass\n- [ ] Typecheck passes\n- [ ] Lint and formatting pass\n\n## Review notes\n\nReview the implementation against #${issue.id}.`,
        ],
        { stdio: "inherit" },
      );
    }
  }

  console.log(
    "\nPull requests opened. Merge them through GitHub, then run Sandcastle again.",
  );

  // Stop planning until these PRs merge; otherwise their still-open issues
  // would be selected and implemented again during the next iteration.
  break;
}

console.log("\nAll done.");
