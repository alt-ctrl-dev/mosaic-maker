import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasRepositoryPermission,
  isUserAuthorized,
  requireAuthorizedActor,
  requiresForkApproval,
} from "./auth.mts";

const { mockSpawnSync } = vi.hoisted(() => ({ mockSpawnSync: vi.fn() }));

vi.mock("child_process", () => ({
  default: { spawnSync: mockSpawnSync },
  spawnSync: mockSpawnSync,
}));

const ghResult = (stdout: string | null, status = 0) => ({ status, stdout, stderr: "" });

beforeEach(() => {
  mockSpawnSync.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("hasRepositoryPermission", () => {
  it("denies an empty username before querying GitHub", () => {
    expect(hasRepositoryPermission("")).toBe(false);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("denies a username that starts with a hyphen", () => {
    expect(hasRepositoryPermission("-attacker")).toBe(false);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it.each(["write", "maintain", "admin"])("grants the %s role", (permission) => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission })));

    expect(hasRepositoryPermission("alice")).toBe(true);
  });

  it("denies a read-only role", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission: "read" })));

    expect(hasRepositoryPermission("reader")).toBe(false);
  });

  it("denies when the permission lookup fails", () => {
    mockSpawnSync.mockReturnValue(ghResult(null, 1));

    expect(hasRepositoryPermission("alice")).toBe(false);
  });

  it("denies a malformed API response", () => {
    mockSpawnSync.mockReturnValue(ghResult("not-json"));

    expect(hasRepositoryPermission("alice")).toBe(false);
  });

  it("denies a response without a permission field", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ other: true })));

    expect(hasRepositoryPermission("alice")).toBe(false);
  });
});

describe("isUserAuthorized", () => {
  it("authorizes a user with write permission", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission: "write" })));

    expect(isUserAuthorized("alice")).toBe(true);
  });

  it("denies a user without write permission", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission: "read" })));

    expect(isUserAuthorized("reader")).toBe(false);
  });
});

describe("requireAuthorizedActor", () => {
  it("exits when the triggering actor is unauthorized", () => {
    vi.stubEnv("GITHUB_ACTOR", "attacker");
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission: "read" })));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    requireAuthorizedActor();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not exit when the triggering actor is authorized", () => {
    vi.stubEnv("GITHUB_ACTOR", "maintainer");
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ permission: "write" })));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    requireAuthorizedActor();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe("requiresForkApproval", () => {
  it("treats an invalid PR number as requiring approval", () => {
    expect(requiresForkApproval(-1)).toBe(true);
    expect(requiresForkApproval(0)).toBe(true);
    expect(requiresForkApproval(NaN)).toBe(true);
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("treats a cross-repository PR as requiring approval", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ isCrossRepository: true })));

    expect(requiresForkApproval(42)).toBe(true);
  });

  it("treats a same-repository PR as not requiring approval", () => {
    mockSpawnSync.mockReturnValue(ghResult(JSON.stringify({ isCrossRepository: false })));

    expect(requiresForkApproval(42)).toBe(false);
  });

  it("fails closed when the API request fails", () => {
    mockSpawnSync.mockReturnValue(ghResult(null, 1));

    expect(requiresForkApproval(42)).toBe(true);
  });
});
