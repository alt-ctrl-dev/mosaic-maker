import {
  createIsolatedSandboxProvider,
  type ExecResult,
  type IsolatedSandboxProvider,
} from "@ai-hero/sandcastle";
import { sandboxEnv } from "./sandbox-env.mts";
import { execSync, spawn, spawnSync } from "child_process";
import { stat, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Type of the isolated Docker provider, named for the project-specific
 * provider exported by {@link isolatedDockerSandbox}.
 */
export type IsolatedDockerSandbox = IsolatedSandboxProvider;

/**
 * Accumulates process output into complete lines, delivering each non-empty
 * line to `onLine` as it arrives. A trailing partial line is held back until
 * the next chunk or `finish()`, so messages split across chunk boundaries are
 * delivered intact rather than as broken fragments.
 */
function createLineCollector(onLine?: (line: string) => void) {
  let buffer = "";
  let text = "";

  const push = (chunk: string): void => {
    const lines = (buffer + chunk).split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        text += `${line}\n`;
        onLine?.(line);
      }
    }
  };

  const finish = (): void => {
    if (buffer.trim()) {
      text += buffer;
      onLine?.(buffer.trim());
    }
  };

  return { push, finish, text: () => text };
}

/**
 * Runs a command in the container with stdin piped, streaming complete lines
 * to `onLine` as they arrive.
 */
async function execStreaming(
  containerName: string,
  command: string,
  stdin: string,
  onLine?: (line: string) => void,
): Promise<ExecResult> {
  const child = spawn("docker", [
    "exec",
    "-i",
    containerName,
    "sh",
    "-c",
    command,
  ]);

  const stdout = createLineCollector(onLine);
  const stderr = createLineCollector();

  child.stdout.on("data", (data: Buffer) => stdout.push(data.toString()));
  child.stderr.on("data", (data: Buffer) => stderr.push(data.toString()));

  child.stdin.write(stdin);
  child.stdin.end();

  return new Promise<ExecResult>((resolve, reject) => {
    child.on("close", (exitCode) => {
      stdout.finish();
      stderr.finish();
      resolve({
        stdout: stdout.text().trim(),
        stderr: stderr.text().trim(),
        exitCode: exitCode ?? 0,
      });
    });
    child.on("error", reject);
  });
}

/**
 * Isolated Docker sandbox provider that prevents untrusted execution from
 * accessing host Git metadata and credentials.
 *
 * Unlike bind-mount providers, this provider does not automatically mount
 * host directories. File transfers use explicit copy operations instead of
 * bind mounts. Git operations remain outside the sandbox in trusted
 * orchestration code.
 */
export const isolatedDockerSandbox: IsolatedDockerSandbox = createIsolatedSandboxProvider({
  name: "docker-isolated",
  env: sandboxEnv,
  create: async (createOptions) => {
    const containerName = `sandcastle-isolated-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const worktreePath = "/workspace";

    // Only forward explicitly allowed environment variables to prevent
    // credential leakage. Host credentials such as GH_TOKEN are dropped.
    const allowedEnvKeys = ["OPENROUTER_API_KEY"];
    const filteredCreateEnv = Object.fromEntries(
      Object.entries(createOptions.env || {}).filter(([key]) =>
        allowedEnvKeys.includes(key),
      ),
    );
    const mergedEnv = { ...sandboxEnv, ...filteredCreateEnv };
    const envArgs = Object.entries(mergedEnv)
      .map(([k, v]) => `-e ${k}='${v.replace(/'/g, "'\\''")}'`)
      .join(" ");

    try {
      execSync(
        `docker run -d --name ${containerName} ` +
          `-e HOME=/tmp --workdir ${worktreePath} ` +
          `${envArgs} node:24.18.1-bookworm-slim bash -c "` +
          `apt-get update && apt-get install -y git curl jq && ` +
          `npm install -g pnpm@11.10.0 && ` +
          `npm install -g @mariozechner/pi-coding-agent && ` +
          `sleep infinity"`,
        { stdio: "pipe" },
      );
      execSync(`docker exec ${containerName} mkdir -p ${worktreePath}`, {
        stdio: "pipe",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create isolated Docker container: ${message}`);
    }

    const handle = {
      worktreePath,

      exec: async (
        command: string,
        opts?: {
          onLine?: (line: string) => void;
          cwd?: string;
          sudo?: boolean;
          stdin?: string;
        },
      ): Promise<ExecResult> => {
        const cwd = opts?.cwd ?? worktreePath;
        const shellCommand = `cd '${cwd.replace(/'/g, "'\\''")}' && ${command}`;

        if (opts?.stdin !== undefined) {
          return execStreaming(containerName, shellCommand, opts.stdin, opts.onLine);
        }

        const result = spawnSync(
          "docker",
          ["exec", containerName, "sh", "-c", shellCommand],
          { encoding: "utf8" },
        );

        if (opts?.onLine) {
          for (const line of result.stdout.split("\n")) {
            if (line.trim()) {
              opts.onLine(line);
            }
          }
        }

        return {
          stdout: result.stdout.trim(),
          stderr: result.stderr.trim(),
          exitCode: result.status ?? 0,
        };
      },

      copyIn: async (hostPath: string, sandboxPath: string) => {
        try {
          const stats = await stat(hostPath);

          if (stats.isDirectory()) {
            const tarName = `sandcastle-copyin-${Date.now()}.tar.gz`;
            const tarPath = join(tmpdir(), tarName);
            execSync(`tar -czf '${tarPath.replace(/'/g, "'\\''")}' -C '${hostPath.replace(/'/g, "'\\''")}' .`, {
              stdio: "pipe",
            });

            try {
              execSync(`docker cp '${tarPath.replace(/'/g, "'\\''")}' ${containerName}:/tmp/`, {
                stdio: "pipe",
              });
              execSync(
                `docker exec ${containerName} sh -c 'mkdir -p '${sandboxPath.replace(/'/g, "'\\''")}' && tar -xzf /tmp/${tarName} -C '${sandboxPath.replace(/'/g, "'\\''")}' && rm -f /tmp/${tarName}'`,
                { stdio: "pipe" },
              );
            } finally {
              await unlink(tarPath).catch(() => {});
            }
          } else {
            execSync(
              `docker cp '${hostPath.replace(/'/g, "'\\''")}' ${containerName}:${sandboxPath}`,
              { stdio: "pipe" },
            );
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to copy ${hostPath} to sandbox: ${message}`);
        }
      },

      copyFileOut: async (sandboxPath: string, hostPath: string) => {
        try {
          execSync(
            `docker cp ${containerName}:${sandboxPath} '${hostPath.replace(/'/g, "'\\''")}'`,
            { stdio: "pipe" },
          );
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to copy ${sandboxPath} from sandbox: ${message}`);
        }
      },

      close: async () => {
        try {
          execSync(`docker rm -f ${containerName}`, { stdio: "pipe" });
        } catch {
          // Container may already be removed; ignore cleanup errors.
        }
      },
    };

    return handle;
  },
});
