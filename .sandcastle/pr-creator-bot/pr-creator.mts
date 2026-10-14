import { z } from "zod";
import {  createPr, generatePrDescription } from "../sandcastle-bot/pr.mts";
import { dockerSandbox } from "../shared/docker.mts";
import { isolatedDockerSandbox } from "../shared/isolated-docker.mts";
import { enforceSandboxSecurityBoundaries } from "../shared/security-check.mts";
import { spawnSync } from "child_process";

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

// Security check: Ensure sandbox provider meets isolation requirements
await enforceSandboxSecurityBoundaries(isolatedDockerSandbox, process.cwd());

try {
    const branch = {
        current: BRANCH,
        base: BASE_BRANCH
    }
    const {title, description} = await generatePrDescription(isolatedDockerSandbox, ISSUE_ID, branch)

    await createPr(title,description,branch)

} catch(e) {
    console.error(e)
}

console.log("\nAll done.");
