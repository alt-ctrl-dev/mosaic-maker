import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { sandboxEnv } from "./sandbox-env.mts";

export type DockerSandbox = ReturnType<typeof docker>;

/**
 * Legacy bind-mount Docker sandbox. Superseded by
 * {@link isolatedDockerSandbox} which enforces credential isolation
 * and does not automatically mount host Git directories.
 *
 * @deprecated Use {@link isolatedDockerSandbox} from
 *   `../shared/isolated-docker.mts` for all bot execution.
 */
export const dockerSandbox: DockerSandbox = docker({ 
  env: sandboxEnv,
});