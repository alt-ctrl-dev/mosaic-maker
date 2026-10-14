import { describe, it, expect, vi } from "vitest";
import { hasRepositoryPermission, isUserAuthorized, requiresForkApproval } from "./auth.mts";

describe("auth", () => {
  describe("hasRepositoryPermission", () => {
    it("should return false for invalid username", () => {
      // @ts-ignore - we're testing invalid inputs
      expect(hasRepositoryPermission("")).toBe(false);
      // @ts-ignore - we're testing invalid inputs
      expect(hasRepositoryPermission(null)).toBe(false);
      // @ts-ignore - we're testing invalid inputs
      expect(hasRepositoryPermission(undefined)).toBe(false);
    });

    it("should return false for usernames starting with hyphen", () => {
      expect(hasRepositoryPermission("-malicious")).toBe(false);
    });
  });

  describe("isUserAuthorized", () => {
    it("should return false for invalid username", () => {
      // @ts-ignore - we're testing invalid inputs
      expect(isUserAuthorized("")).toBe(false);
      // @ts-ignore - we're testing invalid inputs
      expect(isUserAuthorized(null)).toBe(false);
      // @ts-ignore - we're testing invalid inputs
      expect(isUserAuthorized(undefined)).toBe(false);
    });
  });

  describe("requiresForkApproval", () => {
    it("should return true for invalid PR number", () => {
      expect(requiresForkApproval(-1)).toBe(true);
      expect(requiresForkApproval(0)).toBe(true);
      expect(requiresForkApproval(NaN)).toBe(true);
    });
  });
});