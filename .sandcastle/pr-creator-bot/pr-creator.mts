import { z } from "zod";
import { sandboxEnv } from "../shared/sandbox-env.mts";
import {  createPr, generatePrDescription } from "../sandcastle-bot/pr.mts";
import { execSync } from "child_process";

const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
const BRANCH = z.coerce.string().default(currentBranch).parse(process.env.BRANCH);
const ISSUE_ID = z.coerce.string().default('').parse(process.env.ISSUE_ID);
const BASE_BRANCH = "main"

console.log(`Running for branch ${BRANCH}`);
console.log(`Running for base branch ${BASE_BRANCH}`);

if (!BRANCH) {
    throw new Error()
}

if (!BASE_BRANCH) {
    throw new Error()
}

try {
    const branch = {
        current: BRANCH,
        base: BASE_BRANCH
    }
    const {title, description} = await generatePrDescription(sandboxEnv, ISSUE_ID, branch)

    await createPr(title,description,branch)

} catch(e) {
    console.error(e)
}

console.log("\nAll done.");
