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

async function main() {
  console.log("Starting Triage Bot...");

  const issues = getOpenIssuesNeedingTriage();

  if (issues.length === 0) {
    console.log("No open issues need triage.");
    return;
  }

  console.log(`Found ${issues.length} issue(s) needing triage`);

  const results = await Promise.allSettled(
    issues.map(async (issue) => {
      console.log(`\nTriaging issue #${issue.number}: ${issue.title}`);

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
