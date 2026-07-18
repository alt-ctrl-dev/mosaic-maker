import { execSync } from "child_process";
import { SandboxEnv } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import fs from 'node:fs';

const maybeAttachIssueId = (description: string, issueId: string|undefined) => {
    if (issueId === "" || issueId === undefined) {
        return description
    }
    return `
${description}

## References

Closes #${issueId}
`
}

export const generatePrDescription = async (sandboxEnv: SandboxEnv, issueId: string, branch: {
    base?: string; current: string
}) => {
    const BASE_BRANCH = branch.base ?? "main"
    //Parallelize steps
    const [prTitle, prDescription] = await Promise.all([
        sandcastle.run({
            sandbox: docker({ env: sandboxEnv }),
            name: "pr-title-generator",
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/pr-title-prompt.md",
            promptArgs: { BRANCH: branch.current, BASE_BRANCH, },
            output: sandcastle.Output.string({ tag: "pr-title" }),
        }),
        sandcastle.run({
            sandbox: docker({ env: sandboxEnv }),
            name: "pr-description-generator",
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/pr-description-prompt.md",
            promptArgs: { BRANCH: branch.current, BASE_BRANCH },
            output: sandcastle.Output.string({ tag: "pr-description" }),
        })
    ]);

    const description = maybeAttachIssueId(prDescription.output, issueId)

    return {
        title: prTitle.output,
        description
    }
}

export const createPr = async (title: string, description: string, branch: {
    base?: string; current: string
}) => {
    // -----------------------------------------------------------------------
    // Create Pull Request
    //
    // Create a pull request for the branch.
    // -----------------------------------------------------------------------
    const prDescriptionFileName = "pr-description.md"
    const BASE_BRANCH = branch.base ?? "main"
    console.log("\n================ PR Title ================\n", title);
    console.log("\n============= PR Description =============\n", description);

    try {
        // Escape quotes in title and body for shell
        const escapedTitle = title.replace(/"/g, '\\"');


        // publish branch and push changes
        execSync(
            `git push --set-upstream origin ${branch.current}`,
            { stdio: "inherit" }
        );


        fs.writeFileSync(prDescriptionFileName, description);
        execSync(
            `gh pr create --title "${escapedTitle}" --body-file=${prDescriptionFileName} --base ${BASE_BRANCH} --head ${branch.current}`,
            { stdio: "inherit" }
        );

        console.log("Pull request created successfully.");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to create pull request:", message);
        throw error;
    }
    finally {
        fs.rmSync(prDescriptionFileName)
    }
}