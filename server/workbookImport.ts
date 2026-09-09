import * as XLSX from "xlsx";
import { and, eq } from "drizzle-orm";
import { discipulators, youths } from "../drizzle/schema";
import { calendarDate, todayCalendarDate } from "@shared/calendar";
import { normalizeImportText } from "./importRules";

type ImportResult = { created: number; updated: number; duplicates: number; errors: Array<{ row: number; message: string }>; withoutPhoto: number; withoutBirthDate: number };

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function field(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row);
  const wanted = names.map(normalizeImportText);
  return text(entries.find(([key]) => wanted.includes(normalizeImportText(key)))?.[1]);
}

function parseBirthDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return calendarDate(value);
  const brazilian = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (brazilian) return calendarDate(`${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}`);
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 1) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) return calendarDate(`${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`);
  }
  throw new Error("data de nascimento inválida");
}

function phone(value: string) {
  return value.replace(/\D/g, "");
}

export async function importYouthsWorkbook(db: any, buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha não possui uma aba válida.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const result: ImportResult = { created: 0, updated: 0, duplicates: 0, errors: [], withoutPhoto: 0, withoutBirthDate: 0 };
  const existing = await db.select().from(youths);
  const byPhone = new Map<string, any[]>();
  const byPerson = new Map<string, any[]>();
  for (const youth of existing) {
    const normalizedPhone = phone(youth.whatsapp ?? "");
    if (normalizedPhone) byPhone.set(normalizedPhone, [...(byPhone.get(normalizedPhone) ?? []), youth]);
    const personKey = `${normalizeImportText(youth.name)}:${String(youth.birthDate).slice(0, 10)}`;
    byPerson.set(personKey, [...(byPerson.get(personKey) ?? []), youth]);
  }
  await db.transaction(async (tx: any) => {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const name = field(row, ["nome", "nome completo", "jovem"]);
      const whatsapp = phone(field(row, ["telefone", "whatsapp", "celular"]));
      const birthValue = field(row, ["data de nascimento", "nascimento", "birthdate"]);
      const photo = field(row, ["foto", "photo", "photo url"]);
      if (!name) { result.errors.push({ row: rowNumber, message: "nome ausente" }); continue; }
      let birthDate = "";
      try { birthDate = parseBirthDate(birthValue); } catch (error) { result.errors.push({ row: rowNumber, message: String(error instanceof Error ? error.message : error) }); continue; }
      if (!birthDate) result.withoutBirthDate += 1;
      if (!photo) result.withoutPhoto += 1;
      const candidates = whatsapp ? byPhone.get(whatsapp) ?? [] : byPerson.get(`${normalizeImportText(name)}:${birthDate}`) ?? [];
      if (candidates.length > 1) { result.errors.push({ row: rowNumber, message: "registro ambíguo; nenhum cadastro foi alterado" }); continue; }
      const values = { name, whatsapp, ...(birthDate ? { birthDate } : {}), ...(photo ? { photoUrl: photo } : {}), discipleshipStartDate: todayCalendarDate(), relationshipStatus: "active" as const };
      if (candidates[0]) {
        await tx.update(youths).set(values).where(eq(youths.id, candidates[0].id));
        result.updated += 1;
        result.duplicates += 1;
      } else {
        if (!birthDate) { result.errors.push({ row: rowNumber, message: "data de nascimento ausente; cadastro não criado" }); continue; }
        const [inserted] = await tx.insert(youths).values({ ...values, discipulatorId: null });
        const created = { id: inserted.insertId, ...values };
        result.created += 1;
        if (whatsapp) byPhone.set(whatsapp, [created]);
        byPerson.set(`${normalizeImportText(name)}:${birthDate}`, [created]);
      }
    }
  });
  return result;
}

export async function importDiscipulatorsWorkbook(db: any, buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha não possui uma aba válida.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const result: ImportResult = { created: 0, updated: 0, duplicates: 0, errors: [], withoutPhoto: 0, withoutBirthDate: 0 };
  const existing = await db.select().from(discipulators);
  await db.transaction(async (tx: any) => {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      const name = field(row, ["nome", "nome do discipulador", "discipulador"]);
      const whatsapp = phone(field(row, ["telefone", "whatsapp", "celular"]));
      const photo = field(row, ["foto", "photo", "photo url"]);
      if (!name || !whatsapp) { result.errors.push({ row: rowNumber, message: "nome ou telefone ausente" }); continue; }
      if (!photo) result.withoutPhoto += 1;
      const candidates = existing.filter((item: any) => phone(item.whatsapp) === whatsapp || normalizeImportText(item.name) === normalizeImportText(name));
      if (candidates.length > 1) { result.errors.push({ row: rowNumber, message: "discipulador ambíguo" }); continue; }
      const values = { name, whatsapp, ...(photo ? { photoUrl: photo } : {}), status: "active" as const };
      if (candidates[0]) { await tx.update(discipulators).set(values).where(eq(discipulators.id, candidates[0].id)); result.updated += 1; result.duplicates += 1; }
      else { const [inserted] = await tx.insert(discipulators).values(values); existing.push({ id: inserted.insertId, ...values }); result.created += 1; }
    }
  });
  return result;
}