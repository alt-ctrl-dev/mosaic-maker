import { SandboxEnv } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

export const createPr = async (sandboxEnv: SandboxEnv, issueId: string, branch: {
    base?: string; current: string
}) => {

    // -----------------------------------------------------------------------
    // Create Pull Request
    //
    // Create a pull request for the branch.
    // -----------------------------------------------------------------------

    const BASE_BRANCH = branch.base ?? "main"
    const prTitle = await sandcastle.run({
        sandbox: docker({ env: sandboxEnv }),
        name: "pr-title-generator",
        // One iteration is enough: the agent just needs to read and reason,
        // not write code. (Structured output requires maxIterations: 1.)
        maxIterations: 1,
        agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
        promptFile: "./.sandcastle/pr-title.md",
        promptArgs: { BRANCH: branch.current, BASE_BRANCH, ISSUE_ID: issueId },
        // Extract and validate the <plan> output into a string. Throws
        // StructuredOutputError if the tag is missing, the output is malformed, or
        // validation fails — which aborts the loop.
        output: sandcastle.Output.string({ tag: "pr-title" }),
    });


    console.log("\nGenerating PR description...\n");
    const prDescription = await sandcastle.run({
        sandbox: docker({ env: sandboxEnv }),
        name: "pr-description-generator",
        // One iteration is enough: the agent just needs to read and reason,
        // not write code. (Structured output requires maxIterations: 1.)
        maxIterations: 1,
        agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
        promptFile: "./.sandcastle/pr-description.md",
        promptArgs: { BRANCH: branch.current, BASE_BRANCH, ISSUE_ID: issueId },
        // Extract and validate the <pr-description> output into a string. Throws
        // StructuredOutputError if the tag is missing, the output is malformed, or
        // validation fails — which aborts the loop.
        output: sandcastle.Output.string({ tag: "pr-description" }),
    });


    console.log(prTitle.output);
    console.log(prDescription.output);

    // TODO create PR
    console.log("Pull request creation complete.");
}