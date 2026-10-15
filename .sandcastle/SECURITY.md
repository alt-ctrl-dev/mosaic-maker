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

## Incident Response

If credential exposure is suspected:

1. Rotate any potentially exposed GitHub tokens
2. Review recent Git operations for unauthorized activity
3. Audit sandcastle bot configurations and execution logs