import { execSync } from "child_process";
import { SandboxEnv } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const maybeAttachIssueId = (issueId: string, description: string) => {
    if (issueId === "") {
        return description
    }
    return `
${description}
## References

Closes #${issueId}
`
}

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
        maxIterations: 1,
        agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
        promptFile: "./.sandcastle/pr-title.md",
        promptArgs: { BRANCH: branch.current, BASE_BRANCH, },
        output: sandcastle.Output.string({ tag: "pr-title" }),
    });


    console.log("\nGenerating PR description...\n");
    const prDescription = await sandcastle.run({
        sandbox: docker({ env: sandboxEnv }),
        name: "pr-description-generator",
        maxIterations: 1,
        agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
        promptFile: "./.sandcastle/pr-description.md",
        promptArgs: { BRANCH: branch.current, BASE_BRANCH },
        output: sandcastle.Output.string({ tag: "pr-description" }),
    });

    const description = maybeAttachIssueId(issueId, prDescription.output)


    console.log("\n================ PR Title ================\n", prTitle.output);
    console.log("\n============= PR Description =============\n", description);

    try {
        // Escape quotes in title and body for shell
        const escapedTitle = prTitle.output.replace(/"/g, '\\"');
        const escapedBody = description.replace(/"/g, '\\"');

        // publish branch and push changes
        execSync(
            `git push --set-upstream origin ${branch.current}`,
            { stdio: "inherit" }
        );
        // #TODO publish branch
        execSync(
            `gh pr create --title "${escapedTitle}" --body "${escapedBody}" --base ${BASE_BRANCH} --head ${branch.current}`,
            { stdio: "inherit" }
        );
        console.log("Pull request created successfully.");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to create pull request:", message);
        throw error;
    }
}