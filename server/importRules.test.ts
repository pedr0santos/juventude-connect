import { describe, expect, it } from "vitest";
import { answerContainsAlias, dedupeYouthRows, normalizeImportText, resolveDiscipulator, selectYouthIdsForAliasRelink } from "./importRules";

describe("import rules", () => {
  it("matches explicit alias words without partial false positives", () => {
    expect(answerContainsAlias("Sim, sou acompanhado pelo Sidy", ["sidy", "sid"])).toBe(true);
    expect(answerContainsAlias("Gabriel", ["gabriel"])).toBe(true);
    expect(answerContainsAlias("Não sei", ["sid"])).toBe(false);
    expect(selectYouthIdsForAliasRelink([{ id: 1, notes: "Resposta: Sidy" }, { id: 2, notes: "Resposta: não sei" }, { id: 3, notes: "Resposta: sideral" }], ["Sidy", "Sid"])).toEqual([1]);
  });
  it("normalizes accents and punctuation", () => {
    expect(normalizeImportText("  Duda Portugal ")).toBe("duda portugal");
  });

  it("deduplicates by phone and by name plus birth date", () => {
    const result = dedupeYouthRows([
      { name: "Ana", birthDate: "2000-01-01", whatsapp: "31999999999" },
      { name: "Outra grafia", birthDate: "2001-01-01", whatsapp: "31999999999" },
      { name: "Bia", birthDate: "2002-02-02", whatsapp: "" },
      { name: " Bia ", birthDate: "2002-02-02", whatsapp: "" },
    ]);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicates).toHaveLength(2);
  });

  it("only resolves a unique discipulator candidate", () => {
    expect(resolveDiscipulator("Duda Portugal", { "duda portugal": 4 })).toBe(4);
    expect(resolveDiscipulator("Sidy", { sidy: 2, "duda sidy": 3 })).toBeUndefined();
    expect(resolveDiscipulator("Não", { "não": 1 })).toBeUndefined();
  });
});
