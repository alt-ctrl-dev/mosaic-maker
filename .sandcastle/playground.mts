import { z } from "zod";
import { sandboxEnv } from "./sandbox-env.mts";
import { createPr } from "./pr.mts";

// const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);
const BRANCH = "refactor-update-sandcastle-workflow"
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

    await createPr(sandboxEnv, "1", {
        current: BRANCH,
        base: BASE_BRANCH
    })

} finally {
}

console.log("\nAll done.");
