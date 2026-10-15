import { createIsolatedSandboxProvider, type IsolatedSandboxProvider } from "@ai-hero/sandcastle";
import { sandboxEnv } from "./sandbox-env.mts";
import { execSync, spawn } from "child_process";
import { stat, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join, basename } from "path";

export type IsolatedDockerSandbox = IsolatedSandboxProvider;

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

    // Only forward explicitly allowed environment variables to prevent credential leakage
    const allowedEnvKeys = ["OPENROUTER_API_KEY"];
    const filteredCreateEnv = Object.fromEntries(
      Object.entries(createOptions.env || {}).filter(([key]) => 
        allowedEnvKeys.includes(key)
      )
    );
    const mergedEnv = { ...sandboxEnv, ...filteredCreateEnv };
    const envArgs = Object.entries(mergedEnv)
      .map(([k, v]) => `-e ${k}='${v.replace(/'/g, "'\\''")}'`)
      .join(" ");

    try {
      execSync(
        `docker run -d --name ${containerName} ` +
          `-e HOME=/tmp --workdir ${worktreePath} ` +
          `${envArgs} node:24.18.1-bookworm-slim bash -c "apt-get update && apt-get install -y git curl jq && sleep infinity"`,
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
      ) => {
        const cwd = opts?.cwd ?? worktreePath;

        if (opts?.stdin) {
          const child = spawn("docker", [
            "exec",
            "-i",
            containerName,
            "sh",
            "-c",
            `cd '${cwd.replace(/'/g, "'\\''")}' && ${command}`,
          ]);

          let stdout = "";
          let stderr = "";

          child.stdin.write(opts.stdin);
          child.stdin.end();

          // Buffer for incomplete lines to handle JSON streaming properly
          let stdoutBuffer = "";
          
          child.stdout.on("data", (data: Buffer) => {
            const chunk = data.toString();
            stdoutBuffer += chunk;
            
            // Process complete lines
            const lines = stdoutBuffer.split("\n");
            // Keep the last incomplete line in the buffer
            stdoutBuffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.trim()) {
                stdout += line + "\n";
                opts.onLine?.(line);
              }
            }
          });

          // Buffer for incomplete stderr lines
          let stderrBuffer = "";
          
          child.stderr.on("data", (data: Buffer) => {
            const chunk = data.toString();
            stderrBuffer += chunk;
            
            // Process complete lines
            const lines = stderrBuffer.split("\n");
            // Keep the last incomplete line in the buffer
            stderrBuffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.trim()) {
                stderr += line + "\n";
              }
            }
          });

          return new Promise((resolve, reject) => {
            child.on("close", (exitCode) => {
              // Process any remaining buffered stdout data
              if (stdoutBuffer.trim()) {
                stdout += stdoutBuffer;
                opts.onLine?.(stdoutBuffer.trim());
              }
              // Process any remaining buffered stderr data
              if (stderrBuffer.trim()) {
                stderr += stderrBuffer;
              }
              resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: exitCode ?? 0,
              });
            });
            child.on("error", reject);
          });
        }

        try {
          const result = execSync(
            `docker exec ${containerName} sh -c 'cd '${cwd.replace(/'/g, "'\\''")}' && ${command}'`,
            { encoding: "utf8", stdio: "pipe" },
          );

          if (opts?.onLine) {
            for (const line of result.toString().split("\n")) {
              if (line.trim()) {
                opts.onLine(line);
              }
            }
          }

          return {
            stdout: result.toString().trim(),
            stderr: "",
            exitCode: 0,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
          return {
            stdout: err.stdout?.toString() ?? "",
            stderr: err.stderr?.toString() ?? String(error),
            exitCode: err.status ?? 1,
          };
        }
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