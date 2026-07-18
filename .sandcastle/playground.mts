import { sandboxEnv } from "./sandbox-env.mts";
import { createPlanAgent } from "./plan.mts";

try {

    const planAgent = createPlanAgent(sandboxEnv)

    const topIssue = await planAgent.run()

    console.log(topIssue)

} catch(e) {
    console.error(e)
}

console.log("\nAll done.");
