import { createIsolatedSandboxProvider, type IsolatedSandboxProvider } from "@ai-hero/sandcastle";
import { docker, type DockerOptions } from "@ai-hero/sandcastle/sandboxes/docker";
import { sandboxEnv } from "./sandbox-env.mts";
import { execSync, spawn } from "child_process";
import { mkdir, writeFile, stat, readFile, unlink } from "fs/promises";
import { tmpdir, homedir } from "os";
import { dirname, join, resolve } from "path";

export type IsolatedDockerSandbox = IsolatedSandboxProvider;

/**
 * Isolated Docker sandbox provider that prevents access to host Git metadata and credentials.
 * 
 * This sandbox provider:
 * - Does NOT automatically mount host .git directories
 * - Separates untrusted execution from trusted orchestration
 * - Prevents access to Git hooks and configuration that could contain credentials
 * - Uses explicit file copy operations instead of bind mounts
 * 
 * Git operations are handled by trusted orchestration code outside the sandbox.
 */
export const isolatedDockerSandbox: IsolatedDockerSandbox = createIsolatedSandboxProvider({
  name: "docker-isolated",
  env: sandboxEnv,
  create: async (createOptions) => {
    // First, create a regular Docker sandbox to get the underlying container functionality
    const baseDockerProvider = docker({
      env: { ...sandboxEnv, ...createOptions.env },
      // Explicitly avoid automatic mounting by not specifying mounts
      // This relies on sandcastle's internal behavior to minimize automatic mounts
    });

    // Get the base provider's create function
    // Note: We're working around TypeScript limitations here since we can't directly
    // access the internal create function of the docker provider
    
    // For now, we'll implement our own isolated Docker provider from scratch
    // that doesn't automatically mount host directories
    
    const containerName = `sandcastle-isolated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const worktreePath = "/workspace";
    
    // Start the container with minimal mounts
    try {
      // Create container with only essential mounts
      execSync(
        `docker run -d --name ${containerName} ` +
        `-e HOME=/tmp ` +
        `--workdir ${worktreePath} ` +
        Object.entries({ ...sandboxEnv, ...createOptions.env })
          .map(([k, v]) => `-e ${k}="${v}"`)
          .join(' ') +
        ` node:18-bookworm-slim sleep infinity`,
        { stdio: 'pipe' }
      );
      
      // Create workspace directory
      execSync(`docker exec ${containerName} mkdir -p ${worktreePath}`, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to create isolated Docker container: ${error.message}`);
    }

    const handle = {
      worktreePath,
      
      exec: async (command: string, opts?: { 
        onLine?: (line: string) => void; 
        cwd?: string; 
        sudo?: boolean; 
        stdin?: string 
      }) => {
        const cwd = opts?.cwd ?? worktreePath;
        
        try {
          if (opts?.stdin) {
            // For commands with stdin, we need to handle streaming differently
            const child = spawn('docker', [
              'exec', '-i', containerName, 'sh', '-c', `cd "${cwd}" && ${command}`
            ]);
            
            let stdout = '';
            let stderr = '';
            
            child.stdin.write(opts.stdin);
            child.stdin.end();
            
            child.stdout.on('data', (data) => {
              const lines = data.toString().split('\n');
              for (const line of lines) {
                if (line.trim()) {
                  stdout += line + '\n';
                  if (opts.onLine) opts.onLine(line);
                }
              }
            });
            
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            return new Promise((resolve, reject) => {
              child.on('close', (exitCode) => {
                resolve({
                  stdout: stdout.trim(),
                  stderr: stderr.trim(),
                  exitCode: exitCode || 0
                });
              });
              
              child.on('error', (error) => {
                reject(error);
              });
            });
          } else {
            // For simple commands, use execSync
            const result = execSync(
              `docker exec ${containerName} sh -c 'cd "${cwd}" && ${command}'`,
              { 
                encoding: 'utf8',
                stdio: opts?.onLine ? 'pipe' : 'pipe'
              }
            );
            
            if (opts?.onLine) {
              const lines = result.toString().split('\n');
              for (const line of lines) {
                if (line.trim()) {
                  opts.onLine(line);
                }
              }
            }
            
            return {
              stdout: result.toString().trim(),
              stderr: '',
              exitCode: 0
            };
          }
        } catch (error: any) {
          return {
            stdout: error.stdout ? error.stdout.toString() : '',
            stderr: error.stderr ? error.stderr.toString() : error.message,
            exitCode: error.status || 1
          };
        }
      },
      
      copyIn: async (hostPath: string, sandboxPath: string) => {
        try {
          const stats = await stat(hostPath);
          
          if (stats.isDirectory()) {
            // For directories, create a tarball and extract it in the container
            const tarPath = join(tmpdir(), `sandcastle-copyin-${Date.now()}.tar.gz`);
            execSync(`tar -czf "${tarPath}" -C "${hostPath}" .`, { stdio: 'pipe' });
            
            try {
              // Copy tarball to container
              execSync(`docker cp "${tarPath}" ${containerName}:/tmp/`, { stdio: 'pipe' });
              
              // Extract in container
              const containerTarPath = `/tmp/${require('path').basename(tarPath)}`;
              execSync(
                `docker exec ${containerName} sh -c 'mkdir -p "${sandboxPath}" && tar -xzf "${containerTarPath}" -C "${sandboxPath}" && rm -f "${containerTarPath}"'`,
                { stdio: 'pipe' }
              );
            } finally {
              // Clean up local tarball
              await unlink(tarPath).catch(() => {});
            }
          } else {
            // For files, use docker cp directly
            execSync(`docker cp "${hostPath}" ${containerName}:${sandboxPath}`, { stdio: 'pipe' });
          }
        } catch (error) {
          throw new Error(`Failed to copy ${hostPath} to sandbox: ${error.message}`);
        }
      },
      
      copyFileOut: async (sandboxPath: string, hostPath: string) => {
        try {
          // Copy from container to host
          execSync(`docker cp ${containerName}:${sandboxPath} "${hostPath}"`, { stdio: 'pipe' });
        } catch (error) {
          throw new Error(`Failed to copy ${sandboxPath} from sandbox: ${error.message}`);
        }
      },
      
      close: async () => {
        try {
          execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
    
    return handle;
  }
});