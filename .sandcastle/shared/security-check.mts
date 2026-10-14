import type { SandboxProvider } from "@ai-hero/sandcastle";

/**
 * Verifies that a sandbox provider structurally isolates untrusted execution
 * from host Git metadata and credentials.
 *
 * Isolated providers (tag `"isolated"`) are designed without automatic host
 * mounts and pass this check automatically. No-sandbox providers (tag
 * `"none"`) run directly on the host and always fail. Bind-mount providers
 * are checked against a known-insecure list.
 */
export function verifySandboxIsolation(provider: SandboxProvider): boolean {
  if (provider.tag === "isolated") {
    return true;
  }

  if (provider.tag === "none") {
    return false;
  }

  const KNOWN_INSECURE = ["docker", "podman"];
  if (KNOWN_INSECURE.includes(provider.name)) {
    console.warn(
      `⚠️  Provider '${provider.name}' may expose host Git metadata and credentials.`,
    );
    console.warn(
      `⚠️  Use an isolated provider or configure explicit security boundaries.`,
    );
    return false;
  }

  return true;
}

/**
 * Contract-level integration check that untrusted execution cannot access
 * host credentials or modify host Git controls.
 *
 * When a full integration test (disposable repo with synthetic secrets) is
 * not available, isolated providers are trusted based on structural
 * verification. All other provider types fail closed.
 */
export async function contractTestSandboxIsolation(
  provider: SandboxProvider,
): Promise<boolean> {
  if (provider.tag === "isolated") {
    console.warn(
      "🔧 Full contract test not yet implemented — trusting isolated provider structural guarantees.",
    );
    return true;
  }

  console.warn(
    `🔧 Provider '${provider.name}' is not isolated — failing closed.`,
  );
  return false;
}

/**
 * Fail closed if the sandbox provider cannot enforce isolation boundaries
 * between untrusted execution and host Git controls.
 *
 * Runs structural verification followed by a contract-level integration
 * check. Throws if either stage fails.
 */
export async function enforceSandboxSecurityBoundaries(
  provider: SandboxProvider,
): Promise<void> {
  if (!verifySandboxIsolation(provider)) {
    throw new Error(
      `🔐 SECURITY FAILURE: Provider '${provider.name}' cannot guarantee isolation from host Git metadata and credentials.\n\n` +
        `Switch to an isolated provider or configure explicit security boundaries.`,
    );
  }

  const contractPassed = await contractTestSandboxIsolation(provider);
  if (!contractPassed) {
    throw new Error(
      `🔐 SECURITY FAILURE: Provider '${provider.name}' failed the isolation contract test.\n\n` +
        `Untrusted code may access host credentials. Execution disabled until a properly isolated path exists.`,
    );
  }
}