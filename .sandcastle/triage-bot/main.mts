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

  for (const issue of issues) {
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

    console.log(`Finished triaging issue #${issue.number}.`);
  }

  console.log("\nAll done.");
}

main().catch(console.error);
