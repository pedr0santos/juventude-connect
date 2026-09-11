import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseBirthDate } from "./workbookImport";
import { importYouthsWorkbook } from "./workbookImport";

function workbookBuffer(rows: Array<Record<string, string>>) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Jovens");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function fakeDb(existing: any[] = [], failOnInsert = false) {
  const persisted = [...existing];
  let nextId = Math.max(0, ...persisted.map(youth => youth.id)) + 1;
  const updates: any[] = [];
  const db = {
    persisted,
    updates,
    select: () => ({ from: async () => persisted }),
    transaction: async (callback: (tx: any) => Promise<void>) => {
      const snapshot = persisted.slice();
      try {
        await callback({
          update: () => ({
            set: (values: any) => ({
              where: async () => {
                updates.push(values);
                const youth = persisted[0];
                Object.assign(youth, values);
              },
            }),
          }),
          insert: () => ({
            values: async (values: any) => {
              if (failOnInsert) throw Object.assign(new Error("duplicate entry"), { code: "ER_DUP_ENTRY", sqlState: "23000" });
              persisted.push({ id: nextId++, ...values });
              return [{ insertId: nextId - 1 }];
            },
          }),
        });
      } catch (error) {
        persisted.splice(0, persisted.length, ...snapshot);
        throw error;
      }
    },
  };
  return db;
}

describe("workbook date parsing", () => {
  it("converts Excel serial dates without relying on XLSX.SSF", () => {
    expect(parseBirthDate("43831")).toBe("2020-01-01");
    expect(parseBirthDate("43831.75")).toBe("2020-01-01");
  });

  it("keeps the supported text date formats", () => {
    expect(parseBirthDate("15/08/2005")).toBe("2005-08-15");
    expect(parseBirthDate("2005-08-15")).toBe("2005-08-15");
  });

  it("rejects impossible calendar dates before an import starts", () => {
    expect(() => parseBirthDate("31/02/2005")).toThrow("data de nascimento inválida");
  });
});

describe("atomic youth workbook import", () => {
  it("writes DATE columns as Date values and preserves an existing photo", async () => {
    const youth = { id: 4, name: "Nome antigo", birthDate: "2000-01-01", whatsapp: "31999999999", photoUrl: "/storage/old.jpg" };
    const db = fakeDb([youth]);
    const result = await importYouthsWorkbook(db, workbookBuffer([{ Nome: "Nome atualizado", Telefone: "(31) 99999-9999", "Data de nascimento": "13/04/2008" }]));

    expect(result.updated).toBe(1);
    expect(db.updates[0].birthDate).toBeInstanceOf(Date);
    expect(db.updates[0].discipleshipStartDate).toBeInstanceOf(Date);
    expect(db.updates[0]).not.toHaveProperty("photoUrl");
    expect(youth.photoUrl).toBe("/storage/old.jpg");
  });

  it("creates a youth without a discipulator", async () => {
    const db = fakeDb();
    const result = await importYouthsWorkbook(db, workbookBuffer([{ Nome: "Alicia", Telefone: "31970000000", "Data de nascimento": "13/04/2008" }]));

    expect(result.created).toBe(1);
    expect(db.persisted[0].discipulatorId).toBeNull();
    expect(db.persisted[0].birthDate).toBeInstanceOf(Date);
  });

  it("rolls back database changes and deletes uploads when persistence fails", async () => {
    const deleted: string[] = [];
    const db = fakeDb([], true);
    const storage = {
      put: async () => ({ key: "profiles/youths/import-2-a.jpg", url: "/storage/profiles/youths/import-2-a.jpg" }),
      delete: async (key: string) => { deleted.push(key); },
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });

    await expect(importYouthsWorkbook(db, workbookBuffer([
      { Nome: "Alicia", Telefone: "31970000000", "Data de nascimento": "13/04/2008", Foto: "https://drive.google.com/file/d/abc/view" },
      { Nome: "Bruna", Telefone: "31970000001", "Data de nascimento": "14/04/2008" },
    ]), storage)).rejects.toThrow("duplicate entry");

    globalThis.fetch = originalFetch;
    expect(db.persisted).toHaveLength(0);
    expect(deleted).toEqual(["profiles/youths/import-2-a.jpg"]);
  });

  it("does not upload files when a date is invalid", async () => {
    const db = fakeDb([]);
    let uploads = 0;
    const storage = {
      put: async () => { uploads += 1; return { key: "unused", url: "/storage/unused" }; },
      delete: async () => undefined,
    };

    await expect(importYouthsWorkbook(db, workbookBuffer([{ Nome: "Alicia", Telefone: "31970000000", "Data de nascimento": "31/02/2008", Foto: "https://drive.google.com/file/d/abc/view" }]), storage)).rejects.toThrow("linha 2");
    expect(uploads).toBe(0);
  });

  it("reports the row and youth when a Drive link is not an image", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("<html>login</html>", { status: 200, headers: { "content-type": "text/html" } });
    try {
      await expect(importYouthsWorkbook(fakeDb(), workbookBuffer([{ Nome: "Carla Mendes", Telefone: "31970000002", "Data de nascimento": "15/08/2005", Foto: "https://drive.google.com/file/d/abc/view" }]))).rejects.toThrow('linha 2, jovem "Carla Mendes": o link do Google Drive não retornou uma imagem pública');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});