import { SandboxEnv } from "./types";

export const sandboxEnv: SandboxEnv = {
    OPENROUTER_API_KEY:
        process.env.OPENROUTER_API_KEY ??
        (() => {
            throw new Error("OPENROUTER_API_KEY is required on host");
        })(),
};