import { describe, expect, it } from "vitest";
import { parseBirthDate } from "./workbookImport";

describe("workbook date parsing", () => {
  it("converts Excel serial dates without relying on XLSX.SSF", () => {
    expect(parseBirthDate("43831")).toBe("2020-01-01");
    expect(parseBirthDate("43831.75")).toBe("2020-01-01");
  });

  it("keeps the supported text date formats", () => {
    expect(parseBirthDate("15/08/2005")).toBe("2005-08-15");
    expect(parseBirthDate("2005-08-15")).toBe("2005-08-15");
  });
});