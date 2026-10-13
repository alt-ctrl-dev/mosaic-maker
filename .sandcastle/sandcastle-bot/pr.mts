import { spawnSync } from "child_process";
import * as sandcastle from "@ai-hero/sandcastle";
import type { DockerSandbox } from "../shared/docker.mts";
import { pushBranch } from "../shared/git.mts";
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

export const generatePrDescription = async (dockerSandbox: DockerSandbox, issueId: string, branch: {
    base?: string; current: string
}) => {
    const BASE_BRANCH = branch.base ?? "main"
    //Parallelize steps
    const [prTitle, prDescription] = await Promise.all([
        sandcastle.run({
            sandbox: dockerSandbox,
            name: "pr-title-generator",
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/sandcastle-bot/pr-title-prompt.md",
            promptArgs: { BRANCH: branch.current, BASE_BRANCH, },
            output: sandcastle.Output.string({ tag: "pr-title" }),
        }),
        sandcastle.run({
            sandbox: dockerSandbox,
            name: "pr-description-generator",
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
            promptFile: "./.sandcastle/sandcastle-bot/pr-description-prompt.md",
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

    // Validate inputs to prevent shell injection
    if (!title || typeof title !== 'string') {
        throw new Error('Invalid PR title');
    }
    
    if (!branch.current || typeof branch.current !== 'string') {
        throw new Error('Invalid branch name');
    }
    
    if (BASE_BRANCH && typeof BASE_BRANCH !== 'string') {
        throw new Error('Invalid base branch name');
    }
    
    // Reject inputs that look like options
    if (title.startsWith('-') || branch.current.startsWith('-') || (BASE_BRANCH && BASE_BRANCH.startsWith('-'))) {
        throw new Error('Inputs cannot start with hyphen');
    }

    try {
        await pushBranch(branch.current);

        fs.writeFileSync(prDescriptionFileName, description);
        
        const result = spawnSync(
            "gh", 
            ["pr", "create", "--title", title, "--body-file", prDescriptionFileName, "--base", BASE_BRANCH, "--head", branch.current],
            { stdio: "inherit", encoding: "utf-8" }
        );
        
        if (result.status !== 0) {
            throw new Error(`gh pr create failed with exit code ${result.status}: ${result.stderr || ''}`);
        }

        console.log("Pull request created successfully.");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to create pull request:", message);
        throw error;
    }
    finally {
        if (fs.existsSync(prDescriptionFileName)) {
            fs.rmSync(prDescriptionFileName);
        }
    }
}