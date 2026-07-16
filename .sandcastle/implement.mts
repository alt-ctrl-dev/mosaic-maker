import { Agent, Issue } from "./types";
import * as sandcastle from "@ai-hero/sandcastle";

export const createImplmentAgent = (sandbox: sandcastle.Sandbox, topIssue: Issue): Agent<number> => {
    const agentName = "implementor"

    const run = async () => {
        // -----------------------------------------------------------------------
        // Phase 2: Implement
        //
        // A sonnet agent picks the next open issue, writes the
        // implementation (using RGR: Red → Green → Repeat → Refactor), and
        // commits the result.
        //
        // The agent signals completion via <promise>COMPLETE</promise> when done.
        // -----------------------------------------------------------------------
        // One iteration so each outer pass implements a single issue on its own
        // branch, then hands it to the reviewer. A higher value lets the agent
        // drain the whole backlog onto this one branch in a single pass, which
        // defeats the per-issue review.
        const implement = await sandbox.run({
            name: agentName,
            maxIterations: 1,
            agent: sandcastle.pi("openrouter/qwen/qwen3-coder"),
            promptFile: "./.sandcastle/implement-prompt.md",
            promptArgs: {
                ISSUE_ID: topIssue.id,
                ISSUE_TITLE: topIssue.title,
                BRANCH: topIssue.branch
            },
            completionSignal: "<promise>COMPLETE</promise>"
        });

        console.log(`Commits: ${implement.commits.length}`);

        return implement.commits.length
    }

    return {
        run
    }

}