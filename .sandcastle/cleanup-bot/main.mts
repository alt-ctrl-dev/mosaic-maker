import { cleanupClosedBranches } from "./cleanup.mts";
import { isUserAuthorized } from "../shared/auth.mts";

console.log("Starting Cleanup Bot...");

// Check if bot execution is authorized
const actor = process.env.GITHUB_ACTOR || "unknown";
if (!isUserAuthorized(actor)) {
  console.error(`Actor ${actor} is not authorized to run SandCastle bots`);
  process.exit(1);
}

cleanupClosedBranches();
console.log("Cleanup Bot finished.");
