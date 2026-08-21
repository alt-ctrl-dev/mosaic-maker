import { z } from "zod";

export const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);

export const hooks = {
  sandbox: { onSandboxReady: [{ command: "pnpm install" }] },
};

// On Windows the host's node_modules holds win32 binaries the Linux sandbox
// can't use, and copying the pnpm tree across the Docker bind mount blows the
// 60s copy timeout. Let the onSandboxReady `pnpm install` build it instead.
export const copyToWorktree = process.platform === "win32" ? [] : ["node_modules"];