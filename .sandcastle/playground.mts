import { isolatedDockerSandbox } from "./shared/isolated-docker.mts";
import { createPlanAgent } from "./sandcastle-bot/plan.mts";

try {
  const planAgent = createPlanAgent(isolatedDockerSandbox);

  const topIssue = await planAgent.run();

  console.log(topIssue);
} catch (e) {
  console.error(e);
}

console.log("\nAll done.");
