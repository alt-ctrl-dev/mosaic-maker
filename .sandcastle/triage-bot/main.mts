// Triage Bot — triage open issues that are not yet ready for work
//
// Fetches all open GitHub issues, filters out issues already labelled
// `ready-for-agent` or `ready-for-human`, and runs an agent with the
// /triage skill on each remaining issue.
//
// Usage:
//   pnpm run sandcastle-triage-bot

import * as sandcastle from "@ai-hero/sandcastle";
import { dockerSandbox } from "../shared/docker.mts";
import { getOpenIssuesNeedingTriage } from "./triage.mts";
import { isUserAuthorized } from "../shared/auth.mts";
import { canStartRequest, startRequestTracking } from "../shared/rate-limit.mts";

async function main() {
  console.log("Starting Triage Bot...");

  // Check if bot execution is authorized
  const actor = process.env.GITHUB_ACTOR || "unknown";
  if (!isUserAuthorized(actor)) {
    console.error(`Actor ${actor} is not authorized to run SandCastle bots`);
    process.exit(1);
  }

  const issues = getOpenIssuesNeedingTriage();

  if (issues.length === 0) {
    console.log("No open issues need triage.");
    return;
  }

  console.log(`Found ${issues.length} issue(s) needing triage`);

  const results = await Promise.allSettled(
    issues.map(async (issue) => {
      // Check rate limits before proceeding
      if (!canStartRequest()) {
        console.error(`Skipping issue #${issue.number} due to execution budget limits`);
        throw new Error("Execution budget exceeded");
      }

      console.log(`\nTriaging issue #${issue.number}: ${issue.title}`);

      // Track request for rate limiting
      const requestId = `triage-${issue.number}-${Date.now()}`;
      const stopTracking = startRequestTracking(requestId);
      
      try {
        await sandcastle.run({
          sandbox: dockerSandbox,
          name: `triage-issue-${issue.number}`,
          agent: sandcastle.pi("openrouter/anthropic/claude-opus-4.8"),
          promptFile: "./.sandcastle/triage-bot/triage-prompt.md",
          promptArgs: {
            ISSUE_NUMBER: issue.number.toString(),
            ISSUE_TITLE: issue.title,
          },
          completionSignal: "<promise>COMPLETE</promise>",
        });
      } finally {
        stopTracking();
      }

      return issue.number;
    }),
  );

  const succeeded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const failed = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ issue: issues[index], reason: result.reason }]
      : [],
  );

  console.log(`\nTriaged ${succeeded.length}/${issues.length} issue(s).`);

  for (const issueNumber of succeeded) {
    console.log(`✓ #${issueNumber}`);
  }

  for (const failure of failed) {
    console.error(`✗ #${failure.issue.number}: ${failure.issue.title}`);
    console.error(failure.reason);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }

  console.log("\nAll done.");
}

main().catch(console.error);
