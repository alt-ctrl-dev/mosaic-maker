// Cleanup Bot - Remove local branches for closed PRs/issues
//
// This script scans for closed PRs and issues and removes associated local branches
// to reduce repository bloat.
//
// Usage:
//   npx tsx .sandcastle/cleanup-bot/main.mts
// Or add to package.json:
//   "scripts": { "sandcastle-cleanup": "npx tsx .sandcastle/cleanup-bot/main.mts" }

import { cleanupClosedBranches } from "./cleanup.mts";

async function main() {
  console.log("Starting Cleanup Bot...");

  await cleanupClosedBranches();
  
  console.log("Cleanup Bot finished.");
}

main().catch(console.error);