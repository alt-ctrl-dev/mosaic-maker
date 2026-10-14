// PR Bot - Process /sandcastle comments on PRs
//
// This script scans open PRs for /sandcastle comments and processes them.
// It can either implement requested changes or ask for more information.
//
// Usage:
//   npx tsx .sandcastle/pr-bot/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle-pr-bot": "npx tsx .sandcastle/pr-bot/main.mts" }

import { getOpenPRs, getUnresolvedSandcastleCommentsForPR } from "./github.mts";
import { processPRComments } from "./agents.mts";
import { isolatedDockerSandbox } from "../shared/isolated-docker.mts";
import { enforceSandboxSecurityBoundaries } from "../shared/security-check.mts";

async function main() {
  console.log("Starting PR Bot...");

  await enforceSandboxSecurityBoundaries(isolatedDockerSandbox);

  const prs = await getOpenPRs();

  if (prs.length === 0) {
    console.log("No open PRs found.");
    return;
  }

  console.log(`Found ${prs.length} open PRs`);

  for (const pr of prs) {
    const comments = await getUnresolvedSandcastleCommentsForPR(pr.number);
    await processPRComments(pr, comments, { dockerSandbox: isolatedDockerSandbox });
    console.log(`Finished processing comments for PR #${pr.number}.`);
  }
}

main().catch(console.error);
