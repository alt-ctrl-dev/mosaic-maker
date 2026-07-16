import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";
import { Agent, Issue, SandboxEnv } from "./types";

const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});


export const createPlanAgent = (sandboxEnv: SandboxEnv): Agent<Issue | never> => {
const agentName = "planner"
  const planWork = async (): Promise<Issue | never> => {
    // -------------------------------------------------------------------------
    // Phase: Plan
    //
    // The planning agent (opus, for deeper reasoning) reads the open issue list,
    // builds a dependency graph, and selects the issues that can be worked in
    // parallel right now (i.e., no blocking dependencies on other open issues).
    //
    // It outputs a <plan> JSON block — Output.object parses and validates it.
    // -------------------------------------------------------------------------
    const plan = await sandcastle.run({
      sandbox: docker({ env: sandboxEnv }),
      name: agentName,
      // One iteration is enough: the planner just needs to read and reason,
      // not write code. (Structured output requires maxIterations: 1.)
      maxIterations: 1,
      // Opus for planning: dependency analysis benefits from deeper reasoning.
      agent: sandcastle.pi("openrouter/anthropic/claude-haiku-4.5"),
      promptFile: "./.sandcastle/plan-prompt.md",
      // Extract and validate the <plan> JSON into a typed object. Throws
      // StructuredOutputError if the tag is missing, the JSON is malformed, or
      // validation fails — which aborts the loop.
      output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
    });

    if (!plan.output.issues.length) {
      console.log("Planning agent found no tasks to work on. Stopping.");
      throw new Error()
    }
    return plan.output.issues[0];
  }

  return {
    run: planWork
  }

}

