/**
 * Rate limiting utilities for bot execution budgets
 */

// Default execution limits from the specification
const DEFAULT_CONCURRENT_REQUESTS = 2;
const DEFAULT_MAX_REQUESTS_PER_INVOCATION = 10;
const DEFAULT_TIMEOUT_MINUTES = 30;

/**
 * Global counters for tracking execution budgets
 */
let concurrentRequests = 0;
const requestCounts = new Map<string, number>(); // Track requests per invocation
const activeRequests = new Map<string, { startTime: Date; timeoutId: NodeJS.Timeout }>();

/**
 * Configuration for execution budgets
 */
export type RateLimitConfig = {
  maxConcurrentRequests?: number;
  maxRequestsPerInvocation?: number;
  timeoutMinutes?: number;
};

/**
 * Default rate limit configuration
 */
const defaultConfig: Required<RateLimitConfig> = {
  maxConcurrentRequests: DEFAULT_CONCURRENT_REQUESTS,
  maxRequestsPerInvocation: DEFAULT_MAX_REQUESTS_PER_INVOCATION,
  timeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
};

/**
 * Checks if a new request can be started based on rate limits
 * 
 * @param config Rate limiting configuration
 * @returns true if request can proceed, false otherwise
 */
export const canStartRequest = (config: RateLimitConfig = {}): boolean => {
  const effectiveConfig = { ...defaultConfig, ...config };
  
  // Check concurrent request limit
  if (concurrentRequests >= effectiveConfig.maxConcurrentRequests) {
    console.warn(`Concurrent request limit reached (${effectiveConfig.maxConcurrentRequests})`);
    return false;
  }
  
  // Check requests per invocation limit
  const invocationId = getInvocationId();
  const currentCount = requestCounts.get(invocationId) || 0;
  if (currentCount >= effectiveConfig.maxRequestsPerInvocation) {
    console.warn(`Request limit per invocation reached (${effectiveConfig.maxRequestsPerInvocation})`);
    return false;
  }
  
  return true;
};

/**
 * Starts tracking a request and enforces timeouts
 * 
 * @param requestId Unique identifier for the request
 * @param config Rate limiting configuration
 * @returns Cleanup function to call when request completes
 */
export const startRequestTracking = (
  requestId: string,
  config: RateLimitConfig = {}
): (() => void) => {
  const effectiveConfig = { ...defaultConfig, ...config };
  
  // Increment counters
  concurrentRequests++;
  const invocationId = getInvocationId();
  const currentCount = requestCounts.get(invocationId) || 0;
  requestCounts.set(invocationId, currentCount + 1);
  
  // Set timeout for the request
  const startTime = new Date();
  const timeoutId = setTimeout(() => {
    console.error(`Request ${requestId} timed out after ${effectiveConfig.timeoutMinutes} minutes`);
    // Note: We can't force-terminate the request, but we can log it
  }, effectiveConfig.timeoutMinutes * 60 * 1000);
  
  activeRequests.set(requestId, { startTime, timeoutId });
  
  // Return cleanup function
  return () => {
    // Decrement concurrent requests
    concurrentRequests = Math.max(0, concurrentRequests - 1);
    
    // Clear timeout
    const requestInfo = activeRequests.get(requestId);
    if (requestInfo) {
      clearTimeout(requestInfo.timeoutId);
      activeRequests.delete(requestId);
    }
  };
};

/**
 * Gets a unique identifier for the current invocation
 * 
 * @returns Invocation identifier based on timestamp and process ID
 */
const getInvocationId = (): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${date}-${process.pid}`;
};

/**
 * Gets current rate limit status
 * 
 * @returns Object with current rate limit metrics
 */
export const getRateLimitStatus = () => {
  const invocationId = getInvocationId();
  const requestsThisInvocation = requestCounts.get(invocationId) || 0;
  
  return {
    concurrentRequests,
    requestsThisInvocation,
    activeRequests: Array.from(activeRequests.keys()),
  };
};