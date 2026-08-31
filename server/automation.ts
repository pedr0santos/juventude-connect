export function renderTemplate(template: string, variables: Record<string, string | number>) {
  return Object.entries(variables).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)), template);
}

export function makeBirthdayReference(youthId: number, date = new Date()) {
  return `${youthId}:${date.toISOString().slice(0, 10)}`;
}

export function makeAbsenceReference(youthId: number, eventDate: string, eventType: string) {
  return `${youthId}:${eventDate}:${eventType.trim().toLowerCase()}`;
}
