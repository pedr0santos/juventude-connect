import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, validatePassword, verifyPassword } from "./passwords";

describe("local authentication primitives", () => {
  it("hashes and verifies passwords without storing the plain text", async () => {
    const password = "uma-senha-segura";
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^scrypt:[^:]+:[a-f0-9]+$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("senha-incorreta", hash)).toBe(false);
  });

  it("normalizes emails and enforces password length", () => {
    expect(normalizeEmail("  Pessoa@Exemplo.COM ")).toBe("pessoa@exemplo.com");
    expect(validatePassword("1234567")).toBe(false);
    expect(validatePassword("12345678")).toBe(true);
    expect(validatePassword("a".repeat(129))).toBe(false);
  });
});
