# Sandcastle Bot Security Model

This document describes the security model for the Sandcastle automation bots.

## Threat Model

The primary security concern is preventing untrusted code execution from accessing host Git metadata and credentials. Specifically:

1. **Host Git Configuration Exposure**: The host's `.git/config` file may contain credentials for remote repositories
2. **Git Hook Execution**: Git hooks in the host repository could execute arbitrary code when the sandbox interacts with Git
3. **Credential Forwarding**: Long-lived host credentials could be forwarded to untrusted execution contexts

## Security Controls

### 1. Isolated Docker Sandbox

The `isolatedDockerSandbox` provider in `shared/isolated-docker.mts` is specifically configured to prevent access to host Git metadata:

- **No automatic Git mounts**: The isolated provider does not bind-mount host directories, preventing exposure of host `.git` directories
- **Separate execution context**: Untrusted code runs in isolated containers without access to host Git configuration
- **Credential isolation**: Only explicitly allowed environment variables (e.g., `OPENROUTER_API_KEY`) are forwarded; host credentials like `GH_TOKEN` are excluded

### 2. Trusted Orchestration Pattern

Git operations that require credentials are handled by trusted orchestration code outside the sandbox:

```typescript
// Trusted orchestration (outside sandbox)
const sandbox = await sandcastle.createSandbox({ /* ... */ });
try {
  // Untrusted agent execution (inside sandbox) 
  await agent.run();
} finally {
  await sandbox.close();
}

// Trusted Git operations (outside sandbox)
await pushBranch(branchName); // Uses host credentials safely
```

### 3. Disposable Workspaces

Agents work in disposable clones without persistent Git metadata:

- Sandcastle creates temporary worktrees for agent execution
- These worktrees contain code but not host Git configuration
- Changes are reviewed before being merged to the main repository

## Verification

To verify that the isolation is working correctly:

1. Check that no `.git` directories from the host are mounted in sandbox containers
2. Verify that agents cannot access host Git configuration or hooks
3. Confirm that all Git operations requiring credentials happen in trusted code

## Why the Custom `isolated-docker.mts` Wrapper Is Required

A natural question is whether the custom provider in `shared/isolated-docker.mts`
can be removed in favour of an isolated sandbox provider shipped by
`@ai-hero/sandcastle`. It cannot. The determination below records why.

### `createIsolatedSandboxProvider` is a tagging factory, not an isolation engine

`createIsolatedSandboxProvider(config)` performs no sandboxing. It returns an
object that only:

- sets `tag: "isolated"`,
- copies `config.name`,
- defaults `config.env` to `{}`, and
- stores the caller-supplied `config.create` function verbatim.

All actual isolation (container creation, environment handling, file transfer,
command execution) lives in the `create` function **the caller provides**. The
library contributes the `"isolated"` tag that `enforceSandboxSecurityBoundaries`
in `shared/security-check.mts` trusts — nothing more.

### The library ships no built-in isolated provider for local Docker

The only providers that call `createIsolatedSandboxProvider` inside the library
are `daytona` and `vercel` — remote, hosted sandboxes that require external
accounts and credentials. The built-in local container providers (`docker`,
`podman`) are **bind-mount** providers (`tag: "bind-mount"`): they mount host
directories, including host Git metadata, which is exactly the exposure this
security model exists to prevent. `security-check.mts` fails closed for every
provider that is not tagged `"isolated"` for that reason.

There is therefore no library-provided isolated path for running bots in a
local Docker container. The custom `create` in `isolated-docker.mts` is the
only implementation that satisfies the isolation contract on this host.

### Hardening the custom wrapper adds beyond any library default

The custom `create` implements concrete controls that no library default
provides:

- **Environment filtering**: only `OPENROUTER_API_KEY` is forwarded into the
  container; all other host variables (including `GH_TOKEN`) are dropped before
  launch, so host credentials never reach untrusted execution.
- **Shell quoting**: every interpolated path and value is single-quote escaped
  before being passed to `docker exec`/`docker cp`, preventing shell injection
  through file names, working directories, or environment values.
- **JSON line streaming**: `exec` buffers partial chunks and emits complete
  lines through `onLine`, satisfying the `IsolatedSandboxHandle` streaming
  contract that drives live feedback and idle timeouts.
- **Image bootstrap with no host mounts**: the container is built from
  `node:24.18.1-bookworm-slim` with Git, pnpm, and the pi agent installed
  inside it, and file movement uses explicit `copyIn`/`copyFileOut` (tar +
  `docker cp`) instead of bind mounts, so the host `.git` directory is never
  exposed.

### Determination

The custom `isolated-docker.mts` wrapper **must be retained**. Removing it and
relying on `@ai-hero/sandcastle` alone would either leave no local isolated
provider at all or fall back to the bind-mount `docker` provider, which
reintroduces the host Git and credential exposure this model is designed to
eliminate. The library's isolated factory only tags a provider as isolated; the
custom wrapper is what makes that tag true for local Docker.

## Incident Response

If credential exposure is suspected:

1. Rotate any potentially exposed GitHub tokens
2. Review recent Git operations for unauthorized activity
3. Audit sandcastle bot configurations and execution logs