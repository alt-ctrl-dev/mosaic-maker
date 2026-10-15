/**
 * Rate limiting utilities for bot execution budgets.
 */

// Default execution limits from the specification.
const DEFAULT_CONCURRENT_REQUESTS = 2;
const DEFAULT_MAX_REQUESTS_PER_INVOCATION = 10;
const DEFAULT_TIMEOUT_MINUTES = 30;

/**
 * Configuration for execution budgets.
 */
export type RateLimitConfig = {
  maxConcurrentRequests?: number;
  maxRequestsPerInvocation?: number;
  timeoutMinutes?: number;
};

/**
 * Default execution budget limits.
 */
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  maxConcurrentRequests: DEFAULT_CONCURRENT_REQUESTS,
  maxRequestsPerInvocation: DEFAULT_MAX_REQUESTS_PER_INVOCATION,
  timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
};

let concurrentRequests = 0;
// Requests accepted in this process run, keyed by invocation.
const requestCounts = new Map<string, number>();
// Timeouts for requests currently in flight.
const activeRequests = new Map<string, NodeJS.Timeout>();

/**
 * Merges the provided configuration over the default execution budgets.
 */
const resolveConfig = (config: RateLimitConfig): Required<RateLimitConfig> => ({
  ...DEFAULT_CONFIG,
  ...config,
});

/**
 * Returns the identifier shared by every request in this process run.
 */
const getInvocationId = (): string => {
  const date = new Date().toISOString().split("T")[0];
  return `${date}-${process.pid}`;
};

/**
 * Checks whether a new request can start within the configured budgets.
 *
 * @param config Overrides for the default execution budgets.
 * @returns true when a request may start, false when a limit is exhausted.
 */
export const canStartRequest = (config: RateLimitConfig = {}): boolean => {
  const effectiveConfig = resolveConfig(config);

  if (concurrentRequests >= effectiveConfig.maxConcurrentRequests) {
    console.warn(`Concurrent request limit reached (${effectiveConfig.maxConcurrentRequests})`);
    return false;
  }

  const requestsThisInvocation = requestCounts.get(getInvocationId()) ?? 0;
  if (requestsThisInvocation >= effectiveConfig.maxRequestsPerInvocation) {
    console.warn(`Request limit per invocation reached (${effectiveConfig.maxRequestsPerInvocation})`);
    return false;
  }

  return true;
};

/**
 * Registers an in-flight request and returns a cleanup function that releases
 * its concurrency slot and timeout when the request finishes.
 *
 * Callers must check {@link canStartRequest} before registering a request.
 *
 * @param requestId Unique identifier for the request.
 * @param config Overrides for the default execution budgets.
 * @returns Cleanup function to invoke when the request completes.
 */
export const startRequestTracking = (
  requestId: string,
  config: RateLimitConfig = {},
): (() => void) => {
  const effectiveConfig = resolveConfig(config);

  concurrentRequests++;
  const invocationId = getInvocationId();
  requestCounts.set(invocationId, (requestCounts.get(invocationId) ?? 0) + 1);

  const timeoutId = setTimeout(() => {
    console.error(`Request ${requestId} timed out after ${effectiveConfig.timeoutMinutes} minutes`);
    // Timed-out work cannot be force-terminated here; the timeout is logged so
    // operators can see when a request overran its budget.
  }, effectiveConfig.timeoutMinutes * 60 * 1000);

  activeRequests.set(requestId, timeoutId);

  return () => {
    concurrentRequests = Math.max(0, concurrentRequests - 1);

    const pendingTimeout = activeRequests.get(requestId);
    if (pendingTimeout !== undefined) {
      clearTimeout(pendingTimeout);
      activeRequests.delete(requestId);
    }
  };
};

/**
 * Returns the current execution budget metrics.
 */
export const getRateLimitStatus = () => ({
  concurrentRequests,
  requestsThisInvocation: requestCounts.get(getInvocationId()) ?? 0,
  activeRequests: Array.from(activeRequests.keys()),
});
