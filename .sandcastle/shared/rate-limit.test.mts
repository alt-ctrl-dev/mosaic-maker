import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  canStartRequest, 
  startRequestTracking, 
  getRateLimitStatus 
} from "./rate-limit.mts";

describe("rate-limit", () => {
  beforeEach(() => {
    // Reset module state
    vi.resetModules();
  });

  describe("canStartRequest", () => {
    it("should allow request when under limits", () => {
      expect(canStartRequest()).toBe(true);
    });

    it("should respect custom configuration", () => {
      // Set a very low limit
      expect(canStartRequest({ maxConcurrentRequests: 0 })).toBe(false);
    });
  });

  describe("startRequestTracking", () => {
    it("should track requests properly", () => {
      const cleanup = startRequestTracking("test-request");
      
      // Should have one active request
      const status = getRateLimitStatus();
      expect(status.concurrentRequests).toBe(1);
      expect(status.activeRequests).toContain("test-request");
      
      // Cleanup should reduce count
      cleanup();
      const statusAfter = getRateLimitStatus();
      expect(statusAfter.concurrentRequests).toBe(0);
    });

    it("should track requests per invocation", () => {
      const cleanup1 = startRequestTracking("test-request-1");
      const cleanup2 = startRequestTracking("test-request-2");
      
      // Should have two active requests
      const status = getRateLimitStatus();
      expect(status.requestsThisInvocation).toBe(2);
      
      cleanup1();
      cleanup2();
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return current status", () => {
      const status = getRateLimitStatus();
      expect(status).toHaveProperty("concurrentRequests");
      expect(status).toHaveProperty("requestsThisInvocation");
      expect(status).toHaveProperty("activeRequests");
    });
  });
});