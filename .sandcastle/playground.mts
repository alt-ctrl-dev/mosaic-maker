import { z } from "zod";
import { sandboxEnv } from "./sandbox-env.mts";
import { createPr } from "./pr.mts";

// const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);
const BRANCH = z.coerce.string().parse(process.env.BRANCH);
const ISSUE_ID = z.coerce.string().parse(process.env.ISSUE_ID);
const BASE_BRANCH = "main"

// console.log(`Running for ${MAX_ITERATIONS} iteration(s)`);
console.log(`Running for branch ${BRANCH}`);
console.log(`Running for branch ${BASE_BRANCH}`);

if (!BRANCH) {
    throw new Error()
}

if (!BASE_BRANCH) {
    throw new Error()
}


// for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
//     console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);
// }

try {

    await createPr(sandboxEnv, ISSUE_ID, {
        current: BRANCH,
        base: BASE_BRANCH
    })

} finally {
}

console.log("\nAll done.");
