import { beforeEach, describe, expect, it, vi } from "vitest";

type RateLimitModule = typeof import("./rate-limit.mts");

let rateLimit: RateLimitModule;

beforeEach(async () => {
  vi.resetModules();
  rateLimit = await import("./rate-limit.mts");
});

describe("canStartRequest", () => {
  it("allows a request when under every limit", () => {
    expect(rateLimit.canStartRequest()).toBe(true);
  });

  it("rejects a request once the concurrent limit is reached", () => {
    const cleanup1 = rateLimit.startRequestTracking("request-1");
    const cleanup2 = rateLimit.startRequestTracking("request-2");

    expect(rateLimit.getRateLimitStatus().concurrentRequests).toBe(2);
    expect(rateLimit.canStartRequest()).toBe(false);

    cleanup1();
    cleanup2();
  });

  it("rejects a request once the per-invocation limit is reached", () => {
    const cleanups = Array.from({ length: 10 }, (_, index) =>
      rateLimit.startRequestTracking(`request-${index}`),
    );
    cleanups.forEach((cleanup) => cleanup());

    expect(rateLimit.getRateLimitStatus().concurrentRequests).toBe(0);
    expect(rateLimit.canStartRequest()).toBe(false);
  });

  it("respects custom configuration", () => {
    expect(rateLimit.canStartRequest({ maxConcurrentRequests: 0 })).toBe(false);
  });
});

describe("startRequestTracking", () => {
  it("releases the concurrency slot on cleanup", () => {
    const cleanup = rateLimit.startRequestTracking("request-1");

    expect(rateLimit.getRateLimitStatus().concurrentRequests).toBe(1);
    expect(rateLimit.getRateLimitStatus().activeRequests).toContain("request-1");

    cleanup();

    expect(rateLimit.getRateLimitStatus().concurrentRequests).toBe(0);
    expect(rateLimit.getRateLimitStatus().activeRequests).not.toContain("request-1");
  });

  it("counts every tracked request toward the per-invocation budget", () => {
    const cleanup1 = rateLimit.startRequestTracking("request-1");
    const cleanup2 = rateLimit.startRequestTracking("request-2");

    expect(rateLimit.getRateLimitStatus().requestsThisInvocation).toBe(2);

    cleanup1();
    cleanup2();
  });
});

describe("getRateLimitStatus", () => {
  it("reports the current budget metrics", () => {
    expect(rateLimit.getRateLimitStatus()).toEqual({
      concurrentRequests: 0,
      requestsThisInvocation: 0,
      activeRequests: [],
    });
  });
});
