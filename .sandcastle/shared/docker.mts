import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { sandboxEnv } from "./sandbox-env.mts";

export type DockerSandbox = ReturnType<typeof docker>;

export const dockerSandbox: DockerSandbox = docker({ env: sandboxEnv });