import { cleanupClosedBranches } from "./cleanup.mts";
import { requireAuthorizedActor } from "../shared/auth.mts";

console.log("Starting Cleanup Bot...");

requireAuthorizedActor();

cleanupClosedBranches();
console.log("Cleanup Bot finished.");
