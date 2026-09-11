import * as XLSX from "xlsx";
import { inflateRawSync } from "node:zlib";
import { and, eq } from "drizzle-orm";
import { discipulators, youths } from "../drizzle/schema";
import { calendarDate, calendarDateValue, todayCalendarDate } from "@shared/calendar";
import { normalizeImportText } from "./importRules";
import { storageDelete, storagePut } from "./storage";

type ImportResult = { created: number; updated: number; duplicates: number; errors: Array<{ row: number; message: string }>; withoutPhoto: number; withoutBirthDate: number; photosDownloaded: number };

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function field(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row);
  const wanted = names.map(normalizeImportText);
  return text(entries.find(([key]) => wanted.includes(normalizeImportText(key)))?.[1]);
}

function excelSerialDate(serial: number) {
  const wholeDays = Math.floor(serial);
  const milliseconds = Date.UTC(1899, 11, 30) + wholeDays * 24 * 60 * 60 * 1000;
  const date = new Date(milliseconds);
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) throw new Error("data de nascimento inválida");
  return validatedCalendarDate(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`);
}

function validatedCalendarDate(value: string) {
  const normalized = calendarDate(value);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("data de nascimento inválida");
  }
  return normalized;
}

export function parseBirthDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return validatedCalendarDate(value);
  const brazilian = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (brazilian) return validatedCalendarDate(`${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}`);
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 1) {
    return excelSerialDate(serial);
  }
  throw new Error("data de nascimento inválida");
}

function phone(value: string) {
  return value.replace(/\D/g, "");
}

function storedDateKey(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  return String(value ?? "").slice(0, 10);
}

function importRowError(rowNumber: number, youthName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Importação cancelada: linha ${rowNumber}, jovem "${youthName}": ${message}`, { cause: error });
}

type ZipEntry = { name: string; data: Buffer };

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) return entries;
  const centralOffset = buffer.readUInt32LE(end + 16);
  const totalEntries = buffer.readUInt16LE(end + 10);
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    entries.set(name, method === 8 ? inflateRawSync(compressed) : Buffer.from(compressed));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlAttribute(xml: string, attribute: string) {
  return xml.match(new RegExp(`${attribute}="([^"]+)"`))?.[1] ?? null;
}

function resolveZipPath(base: string, target: string) {
  const path = target.replace(/^\/+/, "");
  if (path.startsWith("xl/")) return path;
  const parts = base.split("/").slice(0, -1).concat(path.split("/"));
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop(); else resolved.push(part);
  }
  return resolved.join("/");
}

function embeddedPhotosByRow(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheetRels = entries.get("xl/worksheets/_rels/sheet1.xml.rels")?.toString("utf8") ?? "";
  const drawingRelationship = sheetRels.match(/<Relationship[^>]+Type="[^"]*\/drawing"[^>]+Target="([^"]+)"/);
  if (!drawingRelationship) return new Map<number, ZipEntry>();
  const drawingPath = resolveZipPath(sheetPath, drawingRelationship[1]);
  const drawing = entries.get(drawingPath)?.toString("utf8") ?? "";
  const drawingRelsPath = `${drawingPath.slice(0, drawingPath.lastIndexOf("/"))}/_rels/${drawingPath.slice(drawingPath.lastIndexOf("/") + 1)}.rels`;
  const drawingRels = entries.get(drawingRelsPath)?.toString("utf8") ?? "";
  const relationshipTargets = new Map<string, string>();
  const relationshipMatches = drawingRels.match(/<Relationship\b([^>]+)\/>/g) ?? [];
  for (const relationshipXml of relationshipMatches) {
    const match = relationshipXml.match(/<Relationship\b([^>]+)\/>/);
    if (!match) continue;
    const id = xmlAttribute(match[1], "Id");
    const target = xmlAttribute(match[1], "Target");
    if (id && target) relationshipTargets.set(id, resolveZipPath(drawingPath, target));
  }
  const result = new Map<number, ZipEntry>();
  const anchors = drawing.match(/<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g) ?? [];
  for (const block of anchors) {
    const row = Number(block.match(/<(?:xdr:)?from\b[\s\S]*?<((?:xdr:)?row)>(\d+)<\//)?.[2]);
    const relationshipId = block.match(/<a:blip\b[^>]*(?:r:embed|embed)="([^"]+)"/)?.[1];
    const target = relationshipId ? relationshipTargets.get(relationshipId) : null;
    const data = target ? entries.get(target) : null;
    if (Number.isInteger(row) && row >= 0 && data) result.set(row, { name: target ?? "embedded-image", data });
  }
  return result;
}

function linkedPhotosByRow(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheet = entries.get(sheetPath)?.toString("utf8") ?? "";
  const relationships = entries.get("xl/worksheets/_rels/sheet1.xml.rels")?.toString("utf8") ?? "";
  const targets = new Map<string, string>();
  for (const relationshipXml of relationships.match(/<Relationship\b([^>]+)\/>/g) ?? []) {
    const match = relationshipXml.match(/<Relationship\b([^>]+)\/>/);
    if (!match) continue;
    const id = xmlAttribute(match[1], "Id");
    const target = xmlAttribute(match[1], "Target");
    if (id && target && target.startsWith("http")) targets.set(id, target);
  }
  const result = new Map<number, string>();
  for (const hyperlinkXml of sheet.match(/<hyperlink\b[^>]+\/>/g) ?? []) {
    const ref = xmlAttribute(hyperlinkXml, "ref");
    const relationshipId = xmlAttribute(hyperlinkXml, "r:id");
    const target = relationshipId ? targets.get(relationshipId) : null;
    const row = ref ? Number(ref.match(/\d+/)?.[0]) : NaN;
    if (Number.isInteger(row) && target) result.set(row, target);
  }
  return result;
}

function googleDriveFileId(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("google.com") && !url.hostname.endsWith("googleusercontent.com")) return null;
    return url.searchParams.get("id") ?? url.pathname.match(/\/d\/([^/]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

type StorageAdapter = {
  put: typeof storagePut;
  delete: typeof storageDelete;
};

async function downloadDrivePhoto(value: string, youthName: string, rowNumber: number, storage: StorageAdapter) {
  const fileId = googleDriveFileId(value);
  if (!fileId) return null;
  const response = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`);
  if (!response.ok) throw new Error(`não foi possível baixar a foto do Google Drive (HTTP ${response.status})`);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) throw new Error("o link do Google Drive não retornou uma imagem pública");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > 8 * 1024 * 1024) throw new Error("a foto excede o limite de 8 MB");
  return storage.put(`profiles/youths/import-${rowNumber}-${normalizeImportText(youthName).replace(/ /g, "-")}`, data, contentType);
}

export async function importYouthsWorkbook(db: any, buffer: Buffer, storage: StorageAdapter = { put: storagePut, delete: storageDelete }): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha não possui uma aba válida.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const embeddedPhotos = embeddedPhotosByRow(buffer);
  const linkedPhotos = linkedPhotosByRow(buffer);
  const result: ImportResult = { created: 0, updated: 0, duplicates: 0, errors: [], withoutPhoto: 0, withoutBirthDate: 0, photosDownloaded: 0 };
  const uploadedKeys: string[] = [];
  const preparedRows: Array<{ rowNumber: number; name: string; whatsapp: string; birthDate: string; photo: string; embeddedPhoto?: ZipEntry }> = [];
  const validationErrors: Array<{ row: number; message: string }> = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;
    const name = field(row, ["nome", "nome completo", "jovem"]);
    const whatsapp = phone(field(row, ["telefone", "whatsapp", "celular"]));
    const birthValue = field(row, ["data de nascimento", "nascimento", "birthdate"]);
    const photo = linkedPhotos.get(rowNumber) ?? field(row, ["foto", "photo", "photo url"]);
    if (!name) {
      validationErrors.push({ row: rowNumber, message: "nome ausente" });
      continue;
    }
    let birthDate = "";
    try {
      birthDate = parseBirthDate(birthValue);
    } catch (error) {
      validationErrors.push({ row: rowNumber, message: String(error instanceof Error ? error.message : error) });
      continue;
    }
    preparedRows.push({ rowNumber, name, whatsapp, birthDate, photo, embeddedPhoto: embeddedPhotos.get(index + 1) });
  }
  if (validationErrors.length) {
    throw new Error(`Importação cancelada: ${validationErrors.map(error => `linha ${error.row}: ${error.message}`).join("; ")}`);
  }
  const existing = await db.select().from(youths);
  const byPhone = new Map<string, any[]>();
  const byPerson = new Map<string, any[]>();
  for (const youth of existing) {
    const normalizedPhone = phone(youth.whatsapp ?? "");
    if (normalizedPhone) byPhone.set(normalizedPhone, [...(byPhone.get(normalizedPhone) ?? []), youth]);
    const personKey = `${normalizeImportText(youth.name)}:${storedDateKey(youth.birthDate)}`;
    byPerson.set(personKey, [...(byPerson.get(personKey) ?? []), youth]);
  }
  try {
    await db.transaction(async (tx: any) => {
      for (const prepared of preparedRows) {
        const { rowNumber, name, whatsapp, birthDate, photo, embeddedPhoto } = prepared;
        if (!birthDate) result.withoutBirthDate += 1;
        let photoUrl = "";
        if (embeddedPhoto) {
          try {
            const contentType = embeddedPhoto.name.toLowerCase().endsWith(".png") ? "image/png" : embeddedPhoto.name.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
            const uploaded = await storage.put(`profiles/youths/import-${rowNumber}-${normalizeImportText(name).replace(/ /g, "-")}`, embeddedPhoto.data, contentType);
            uploadedKeys.push(uploaded.key);
            photoUrl = uploaded.url;
            result.photosDownloaded += 1;
          } catch (error) {
            console.error("[workbook import] embedded photo failed", { row: rowNumber, youthName: name, message: error instanceof Error ? error.message : String(error) });
            throw importRowError(rowNumber, name, error);
          }
        }
        if (photo) {
          try {
            const uploaded = await downloadDrivePhoto(photo, name, rowNumber, storage);
            if (uploaded) {
              uploadedKeys.push(uploaded.key);
              if (!photoUrl) photoUrl = uploaded.url;
              result.photosDownloaded += 1;
            } else if (!photoUrl && (photo.startsWith("http://") || photo.startsWith("https://"))) {
              photoUrl = photo;
            }
          } catch (error) {
            console.error("[workbook import] linked photo failed", { row: rowNumber, youthName: name, message: error instanceof Error ? error.message : String(error) });
            throw importRowError(rowNumber, name, error);
          }
        }
        if (!photoUrl) result.withoutPhoto += 1;
        const candidates = whatsapp ? byPhone.get(whatsapp) ?? [] : byPerson.get(`${normalizeImportText(name)}:${birthDate}`) ?? [];
        if (candidates.length > 1) throw new Error(`Importação cancelada: linha ${rowNumber}: registro ambíguo`);
        const values = { name, whatsapp, ...(birthDate ? { birthDate: calendarDateValue(birthDate) } : {}), ...(photoUrl ? { photoUrl } : {}), discipleshipStartDate: calendarDateValue(todayCalendarDate()), relationshipStatus: "active" as const };
        if (candidates[0]) {
          await tx.update(youths).set(values).where(eq(youths.id, candidates[0].id));
          result.updated += 1;
          result.duplicates += 1;
        } else {
          if (!birthDate) throw new Error(`Importação cancelada: linha ${rowNumber}: data de nascimento ausente; cadastro não criado`);
          const [inserted] = await tx.insert(youths).values({ ...values, discipulatorId: null });
          const created = { id: inserted.insertId, ...values };
          result.created += 1;
          if (whatsapp) byPhone.set(whatsapp, [created]);
          byPerson.set(`${normalizeImportText(name)}:${birthDate}`, [created]);
        }
      }
    });
  } catch (error) {
    const cleanup = await Promise.allSettled(uploadedKeys.map(key => storage.delete(key)));
    const cleanupFailures = cleanup.filter(item => item.status === "rejected");
    if (cleanupFailures.length) console.error("[workbook import] storage cleanup failed", cleanupFailures.map(item => item.status === "rejected" ? item.reason : item));
    throw error;
  }
  return result;
}

export async function importDiscipulatorsWorkbook(db: any, buffer: Buffer): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("A planilha não possui uma aba válida.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const result: ImportResult = { created: 0, updated: 0, duplicates: 0, errors: [], withoutPhoto: 0, withoutBirthDate: 0, photosDownloaded: 0 };
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