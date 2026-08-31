export type ImportYouth = { name: string; birthDate: string; whatsapp: string };

export function normalizeImportText(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function youthImportKey(row: ImportYouth) {
  const phone = row.whatsapp.replace(/\D/g, "");
  return phone ? `phone:${phone}` : `person:${normalizeImportText(row.name)}:${row.birthDate}`;
}

export function dedupeYouthRows(rows: ImportYouth[]) {
  const seen = new Set<string>();
  const unique: ImportYouth[] = [];
  const duplicates: ImportYouth[] = [];
  for (const row of rows) {
    const key = youthImportKey(row);
    if (seen.has(key)) duplicates.push(row);
    else { seen.add(key); unique.push(row); }
  }
  return { unique, duplicates };
}

export function resolveDiscipulator(answer: string, variants: Record<string, number>) {
  const normalized = normalizeImportText(answer);
  if (!normalized || /^(nao|não|sim|meus pais|meu pai|minha mae|minha mãe)$/.test(normalized)) return undefined;
  const candidates = Object.entries(variants).filter(([key]) => normalized.includes(key) || key.includes(normalized));
  return candidates.length === 1 ? candidates[0][1] : undefined;
}

export function answerContainsAlias(answer: string, aliases: string[]) {
  const normalizedAnswer = normalizeImportText(answer);
  if (!normalizedAnswer) return false;
  const answerWords = new Set(normalizedAnswer.split(" "));
  return aliases.map(normalizeImportText).filter(Boolean).some(alias => {
    const aliasWords = alias.split(" ");
    return aliasWords.every(word => answerWords.has(word));
  });
}

export function selectYouthIdsForAliasRelink(rows: Array<{ id: number; notes: string | null }>, aliases: string[]) {
  return rows.filter(row => answerContainsAlias(row.notes ?? "", aliases)).map(row => row.id);
}
