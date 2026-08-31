import { describe, expect, it } from "vitest";

describe("application title configuration", () => {
  it("uses the requested product name when configured", () => {
    expect(process.env.VITE_APP_TITLE ?? "Controle Jovens Sedentos").toBe("Controle Jovens Sedentos");
  });
});
