import { describe, expect, it } from "vitest";
import { formatBirthdayDate, getNextBirthdayDate, sortUpcomingBirthdays } from "../shared/birthday";

describe("birthday ordering", () => {
  it("formats the exact calendar day without timezone drift", () => {
    expect(formatBirthdayDate("2000-08-21")).toBe("21/08");
    expect(formatBirthdayDate("2000-08-20")).toBe("20/08");
  });
  const reference = new Date(2026, 7, 19);

  it("moves a birthday that already passed to the next year", () => {
    expect(getNextBirthdayDate("2000-04-12", reference)).toEqual(new Date(2027, 3, 12));
  });

  it("keeps upcoming birthdays in chronological order across year-end", () => {
    const ordered = sortUpcomingBirthdays([
      { name: "Janeiro", birthDate: "2000-01-02" },
      { name: "Agosto", birthDate: "2000-08-25" },
      { name: "Dezembro", birthDate: "2000-12-20" },
    ], reference);
    expect(ordered.map(item => item.name)).toEqual(["Agosto", "Dezembro", "Janeiro"]);
  });
});
