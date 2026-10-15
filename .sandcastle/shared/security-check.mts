import type { SandboxProvider } from "@ai-hero/sandcastle";

/**
 * Runtime isolation tag the library attaches to every sandbox provider for its
 * own internal dispatch. The tag is not exposed on the public provider types,
 * so it is read defensively and validated before being trusted.
 */
type IsolationTag = "bind-mount" | "isolated" | "none";

/**
 * Returns the provider's runtime isolation tag, or `undefined` when the value
 * is missing or is not one of the three tags the library emits.
 */
function isolationTagOf(provider: SandboxProvider): IsolationTag | undefined {
  const tag = (provider as { tag?: unknown }).tag;
  return tag === "bind-mount" || tag === "isolated" || tag === "none"
    ? tag
    : undefined;
}

/**
 * Fails closed unless the sandbox provider structurally isolates untrusted
 * execution from host Git metadata and credentials.
 *
 * Only providers tagged `"isolated"` are accepted. Bind-mount and no-sandbox
 * providers run untrusted code with access to host Git controls and are
 * rejected. This is the structural gate that must hold before any execution;
 * it does not replace container-level contract verification of effective
 * mounts and environment.
 *
 * @throws When the provider cannot guarantee isolation.
 */
export async function enforceSandboxSecurityBoundaries(
  provider: SandboxProvider,
): Promise<void> {
  if (isolationTagOf(provider) === "isolated") {
    return;
  }

  const name = provider.name || "unknown";
  throw new Error(
    `🔐 SECURITY FAILURE: Provider '${name}' cannot guarantee isolation from host Git metadata and credentials.\n\n` +
      `Untrusted code may access host credentials. Execution disabled until a properly isolated path exists.`,
  );
}
