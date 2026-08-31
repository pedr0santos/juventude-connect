import { describe, expect, it } from "vitest";
import { canAccessScopedData, isAdmin } from "./access";

describe("authorization boundaries", () => {
  it("allows administrators to access all scoped data", () => {
    expect(canAccessScopedData({ role: "admin", discipulatorId: null })).toBe(true);
    expect(isAdmin({ role: "admin" })).toBe(true);
  });

  it("allows only linked discipulators to access their scoped data", () => {
    expect(canAccessScopedData({ role: "discipulator", discipulatorId: 12 })).toBe(true);
    expect(canAccessScopedData({ role: "discipulator", discipulatorId: null })).toBe(false);
  });

  it("blocks a regular unlinked authenticated user", () => {
    expect(canAccessScopedData({ role: "user", discipulatorId: null })).toBe(false);
    expect(isAdmin({ role: "user" })).toBe(false);
  });
});
