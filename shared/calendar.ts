export const SYSTEM_TIME_ZONE = "America/Sao_Paulo";

export function calendarDate(value: string | Date) {
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  if (Number.isNaN(value.getTime())) throw new Error("Data inválida.");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYSTEM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function todayCalendarDate(reference = new Date()) {
  return calendarDate(reference);
}

export function calendarDateValue(value: string | Date) {
  return new Date(`${calendarDate(value)}T12:00:00.000Z`);
}

export function calendarParts(value: string | Date) {
  const date = calendarDate(value);
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}
