export type BirthdayRecord = {
  birthDate: string | Date;
  name?: string | null;
};

function localBirthdayParts(value: string | Date) {
  if (value instanceof Date) {
    return { month: value.getMonth(), day: value.getDate() };
  }
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { month: Number(match[2]) - 1, day: Number(match[3]) };
}

export function formatBirthdayDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}`;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCDate()).padStart(2, "0")}/${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return "—";
}

export function isBirthdayToday(value: string | Date, reference = new Date()) {
  const parts = localBirthdayParts(value);
  return Boolean(parts && parts.month === reference.getMonth() && parts.day === reference.getDate());
}

export function getNextBirthdayDate(value: string | Date, reference = new Date()) {
  const parts = localBirthdayParts(value);
  if (!parts || parts.day < 1 || parts.day > 31 || parts.month < 0 || parts.month > 11) return null;
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  let next = new Date(today.getFullYear(), parts.month, parts.day);
  if (next < today) next = new Date(today.getFullYear() + 1, parts.month, parts.day);
  return next;
}

export function isBirthdayWithinNextDays(value: string | Date, days = 7, reference = new Date()) {
  const next = getNextBirthdayDate(value, reference);
  if (!next) return false;
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
  return next >= start && next <= end;
}

export function sortUpcomingBirthdays<T extends BirthdayRecord>(records: T[], reference = new Date()) {
  return records
    .map((record, index) => ({ record, index, next: getNextBirthdayDate(record.birthDate, reference) }))
    .filter((item): item is { record: T; index: number; next: Date } => Boolean(item.next))
    .sort((a, b) => a.next.getTime() - b.next.getTime() || String(a.record.name ?? "").localeCompare(String(b.record.name ?? ""), "pt-BR") || a.index - b.index)
    .map(item => item.record);
}
