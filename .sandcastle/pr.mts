import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);
const BRANCH = z.coerce.string().parse(process.env.BRANCH);
const BASE_BRANCH = z.string().default("main").parse(process.env.BASE_BRANCH ?? process.env.TARGET_BRANCH);

console.log(`Running for ${MAX_ITERATIONS} iteration(s)`);

const sandboxEnv = {
    OPENROUTER_API_KEY:
        process.env.OPENROUTER_API_KEY ??
        (() => {
            throw new Error("OPENROUTER_API_KEY is required on host");
        })(),
};


for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);
    console.log(`Running for branch ${BRANCH}`);

    try {
        console.log("\nGenerating PR title...\n");

        const prTitle = await sandcastle.run({
            sandbox: docker({ env: sandboxEnv }),
            name: "pr-title-generator",
            // One iteration is enough: the planner just needs to read and reason,
            // not write code. (Structured output requires maxIterations: 1.)
            maxIterations: 1,
            // Opus for planning: dependency analysis benefits from deeper reasoning.
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/pr-title.md",
            promptArgs: { BRANCH, BASE_BRANCH, ISSUE_ID: 1 },
            // Extract and validate the <plan> JSON into a typed object. Throws
            // StructuredOutputError if the tag is missing, the JSON is malformed, or
            // validation fails — which aborts the loop.
            output: sandcastle.Output.string({ tag: "pr-title" }),
        });

        console.log("\n================ PR Title ================\n");
        console.log(prTitle.output);


        console.log("\nGenerating PR description...\n");
        const prDescription = await sandcastle.run({
            sandbox: docker({ env: sandboxEnv }),
            name: "pr-description-generator",
            // One iteration is enough: the planner just needs to read and reason,
            // not write code. (Structured output requires maxIterations: 1.)
            maxIterations: 1,
            // Opus for planning: dependency analysis benefits from deeper reasoning.
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/pr-description.md",
            promptArgs: { BRANCH, BASE_BRANCH, ISSUE_ID: 1 },
            // Extract and validate the <plan> JSON into a typed object. Throws
            // StructuredOutputError if the tag is missing, the JSON is malformed, or
            // validation fails — which aborts the loop.
            output: sandcastle.Output.string({ tag: "pr-description"}),
        });

        console.log("\n============= PR Description =============\n");
        console.log(prDescription.output);
    } finally {
    }
}

console.log("\nAll done.");
