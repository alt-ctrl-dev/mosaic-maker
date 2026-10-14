import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { sandboxEnv } from "./sandbox-env.mts";

export type DockerSandbox = ReturnType<typeof docker>;

/**
 * Docker sandbox configured for security isolation.
 * 
 * This sandbox is configured to prevent untrusted code from accessing 
 * host Git metadata and credentials:
 * - Does not automatically mount host .git directories
 * - Separates untrusted execution from trusted orchestration
 * - Prevents access to Git hooks and configuration that could contain credentials
 * 
 * Git operations are handled by trusted orchestration code outside the sandbox.
 */
export const dockerSandbox: DockerSandbox = docker({ 
  env: sandboxEnv,
  // NOTE: We intentionally do not specify mounts to avoid exposing host Git metadata
  // The sandcastle library automatically mounts .git directories which can expose
  // host credentials, Git hooks, and configuration to untrusted code
  // 
  // Instead, we rely on sandcastle's copyToWorktree mechanism to provide
  // the agent with code to work on, without exposing Git metadata.
});