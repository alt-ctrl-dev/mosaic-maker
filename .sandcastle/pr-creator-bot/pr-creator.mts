import { z } from "zod";
import {  createPr, generatePrDescription } from "../sandcastle-bot/pr.mts";
import { dockerSandbox } from "../shared/docker.mts";
import { spawnSync } from "child_process";
import { isUserAuthorized } from "../shared/auth.mts";

// Check if bot execution is authorized
const actor = process.env.GITHUB_ACTOR || "unknown";
if (!isUserAuthorized(actor)) {
  console.error(`Actor ${actor} is not authorized to run SandCastle bots`);
  process.exit(1);
}

const revParseResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8" });
if (revParseResult.status !== 0) {
  console.error(`git rev-parse failed with exit code ${revParseResult.status}: ${revParseResult.stderr}`);
  process.exit(1);
}
const currentBranch = revParseResult.stdout.trim();
const BRANCH = z.coerce.string().default(currentBranch).parse(process.env.BRANCH);
const ISSUE_ID = z.coerce.string().default('').parse(process.env.ISSUE_ID);
const BASE_BRANCH = "main"

console.log(`Running for branch ${BRANCH}`);
console.log(`Running for base branch ${BASE_BRANCH}`);

if (!BRANCH) {
    throw new Error("Branch is required");
}

if (!BASE_BRANCH) {
    throw new Error("Base branch is required");
}

try {
    const branch = {
        current: BRANCH,
        base: BASE_BRANCH
    }
    const {title, description} = await generatePrDescription(dockerSandbox, ISSUE_ID, branch)

    await createPr(title,description,branch)

} catch(e) {
    console.error(e)
}

console.log("\nAll done.");
