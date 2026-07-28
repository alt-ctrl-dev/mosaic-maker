import { z } from "zod";

export const MAX_ITERATIONS = z.coerce.number().default(1).parse(process.env.MAX_ITERATIONS);

export const hooks = {
  sandbox: { onSandboxReady: [{ command: "pnpm install" }] },
};

export const copyToWorktree = ["node_modules"];