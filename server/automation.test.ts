import { describe, expect, it } from "vitest";
import { makeAbsenceReference, makeBirthdayReference, renderTemplate } from "./automation";

describe("automação de cuidado", () => {
  it("substitui variáveis da mensagem sem alterar texto não parametrizado", () => {
    expect(renderTemplate("Olá, {{discipulador}}. {{discipulo}} faltou em {{data}}.", { discipulador: "João", discipulo: "Gabriel", data: "19/08" })).toBe("Olá, João. Gabriel faltou em 19/08.");
  });

  it("cria uma chave estável para impedir aniversário duplicado no mesmo dia", () => {
    const date = new Date("2026-08-19T12:00:00.000Z");
    expect(makeBirthdayReference(42, date)).toBe("42:2026-08-19");
    expect(makeBirthdayReference(42, date)).toBe(makeBirthdayReference(42, date));
  });

  it("diferencia faltas por discípulo, data e tipo de culto", () => {
    expect(makeAbsenceReference(10, "2026-08-19", "Culto de celebração")).toBe("10:2026-08-19:culto de celebração");
    expect(makeAbsenceReference(10, "2026-08-19", "Culto de oração")).not.toBe(makeAbsenceReference(10, "2026-08-19", "Culto de celebração"));
  });
});
