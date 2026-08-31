import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, absenceNotifications, appSettings, attendance, discipulators, followUps, messageLogs, users, worshipEvents, youths } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sortUpcomingBirthdays } from "../shared/birthday";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = values[field]; }
  }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getDashboardData(discipulatorId?: number) {
  const db = await getDb(); if (!db) return { youthCount: 0, activeYouthCount: 0, discipulatorCount: 0, birthdays: [], upcoming: [], pendingFollowUps: 0, lastEvent: null, recentAbsences: [] };
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const youthScope = discipulatorId ? eq(youths.discipulatorId, discipulatorId) : undefined;
  const followUpScope = discipulatorId ? eq(followUps.discipulatorId, discipulatorId) : undefined;
  const [youthCount, activeYouthCount, discipulatorCount, birthdays, upcoming, pending, lastEvent, recentAbsences] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(youths).where(youthScope),
    db.select({ count: sql<number>`count(*)` }).from(youths).where(youthScope ? and(youthScope, eq(youths.relationshipStatus, "active")) : eq(youths.relationshipStatus, "active")),
    db.select({ count: sql<number>`count(*)` }).from(discipulators).where(discipulatorId ? eq(discipulators.id, discipulatorId) : eq(discipulators.status, "active")),
    db.select({ id: youths.id, name: youths.name, birthDate: youths.birthDate, whatsapp: youths.whatsapp, discipulatorId: youths.discipulatorId }).from(youths).where(youthScope ? and(youthScope, sql`month(${youths.birthDate}) = ${Number(month)} and day(${youths.birthDate}) = ${Number(day)} and ${youths.relationshipStatus} = 'active'`) : sql`month(${youths.birthDate}) = ${Number(month)} and day(${youths.birthDate}) = ${Number(day)} and ${youths.relationshipStatus} = 'active'`).orderBy(asc(youths.name)),
    db.select({ id: youths.id, name: youths.name, birthDate: youths.birthDate }).from(youths).where(youthScope ? and(youthScope, eq(youths.relationshipStatus, "active")) : eq(youths.relationshipStatus, "active")),
    db.select({ count: sql<number>`count(*)` }).from(followUps).where(followUpScope ? and(followUpScope, eq(followUps.status, "pending")) : eq(followUps.status, "pending")),
    db.select().from(worshipEvents).orderBy(desc(worshipEvents.eventDate)).limit(1),
    db.select({ id: followUps.id, youth: youths.name, discipulator: discipulators.name, status: followUps.status, createdAt: followUps.createdAt }).from(followUps).innerJoin(youths, eq(followUps.youthId, youths.id)).innerJoin(discipulators, eq(followUps.discipulatorId, discipulators.id)).where(followUpScope).orderBy(desc(followUps.createdAt)).limit(6),
  ]);
  const sortedUpcoming = sortUpcomingBirthdays(upcoming, today).slice(0, 6);
  const lastEventStats = lastEvent[0] ? await db.select({ status: attendance.status, count: sql<number>`count(*)` }).from(attendance).where(eq(attendance.eventId, lastEvent[0].id)).groupBy(attendance.status) : [];
  const lastEventCounts = { present: Number(lastEventStats.find(row => row.status === "present")?.count ?? 0), absent: Number(lastEventStats.find(row => row.status === "absent")?.count ?? 0), unmarked: 0 };
  return { youthCount: Number(youthCount[0]?.count ?? 0), activeYouthCount: Number(activeYouthCount[0]?.count ?? 0), discipulatorCount: Number(discipulatorCount[0]?.count ?? 0), birthdays, upcoming: sortedUpcoming, pendingFollowUps: Number(pending[0]?.count ?? 0), lastEvent: lastEvent[0] ?? null, lastEventCounts, recentAbsences };
}

export async function listYouths(search?: string, discipulatorId?: number, ageMin?: number, ageMax?: number, sort: "name" | "birthday" = "name") {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (search) conditions.push(sql`${youths.name} like ${`%${search}%`}`);
  if (discipulatorId) conditions.push(eq(youths.discipulatorId, discipulatorId));
  if (ageMin !== undefined) conditions.push(sql`timestampdiff(year, ${youths.birthDate}, curdate()) >= ${ageMin}`);
  if (ageMax !== undefined) conditions.push(sql`timestampdiff(year, ${youths.birthDate}, curdate()) <= ${ageMax}`);
  const query = db.select({ id: youths.id, name: youths.name, birthDate: youths.birthDate, whatsapp: youths.whatsapp, address: youths.address, photoUrl: youths.photoUrl, notes: youths.notes, relationshipStatus: youths.relationshipStatus, discipleshipStartDate: youths.discipleshipStartDate, discipulatorId: youths.discipulatorId, discipulatorName: discipulators.name }).from(youths).innerJoin(discipulators, eq(youths.discipulatorId, discipulators.id)).where(conditions.length ? and(...conditions) : undefined);
  return sort === "birthday" ? query.orderBy(sql`${youths.birthDate} asc`) : query.orderBy(asc(youths.name));
}

export async function listDiscipulators() {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: discipulators.id, name: discipulators.name, whatsapp: discipulators.whatsapp, status: discipulators.status, notes: discipulators.notes, youthCount: sql<number>`count(${youths.id})`, youthNames: sql<string | null>`group_concat(${youths.name} order by ${youths.name} separator ', ')` }).from(discipulators).leftJoin(youths, eq(youths.discipulatorId, discipulators.id)).groupBy(discipulators.id).orderBy(asc(discipulators.name));
}

export async function listAttendance(eventDate?: string, eventType?: string) {
  const db = await getDb(); if (!db) return [];
  const event = eventDate && eventType ? await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, new Date(eventDate)), eq(worshipEvents.eventType, eventType))).limit(1) : [];
  const eventId = event[0]?.id;
  return db.select({ youthId: youths.id, name: youths.name, attendanceId: attendance.id, status: attendance.status, followUpId: followUps.id, followUpStatus: followUps.status }).from(youths).leftJoin(attendance, eventId ? and(eq(attendance.youthId, youths.id), eq(attendance.eventId, eventId)) : sql`1=0`).leftJoin(followUps, eq(followUps.attendanceId, attendance.id)).where(eq(youths.relationshipStatus, "active")).orderBy(asc(youths.name));
}

export async function getSettings() { const db = await getDb(); if (!db) return null; const result = await db.select().from(appSettings).limit(1); return result[0] ?? null; }

export async function listMessageLogs() { const db = await getDb(); if (!db) return []; return db.select().from(messageLogs).orderBy(desc(messageLogs.createdAt)).limit(80); }

export async function getAttendanceSummary(eventDate: string, eventType: string, discipulatorId?: number) {
  const db = await getDb(); if (!db) return { event: null, totals: { active: 0, present: 0, absent: 0, unmarked: 0, notifications: 0 }, rows: [] };
  const [event] = await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, new Date(eventDate)), eq(worshipEvents.eventType, eventType))).limit(1);
  if (!event) return { event: null, totals: { active: 0, present: 0, absent: 0, unmarked: 0, notifications: 0 }, rows: [] };
  const scope = discipulatorId ? and(eq(youths.discipulatorId, discipulatorId), eq(youths.relationshipStatus, "active")) : eq(youths.relationshipStatus, "active");
  const rows = await db.select({ youthId: youths.id, youthName: youths.name, discipulatorName: discipulators.name, status: attendance.status, notificationStatus: absenceNotifications.status, notificationError: absenceNotifications.error, recipient: absenceNotifications.recipient }).from(youths).leftJoin(discipulators, eq(youths.discipulatorId, discipulators.id)).leftJoin(attendance, and(eq(attendance.youthId, youths.id), eq(attendance.eventId, event.id))).leftJoin(absenceNotifications, eq(absenceNotifications.attendanceId, attendance.id)).where(scope).orderBy(asc(youths.name));
  const totals = { active: rows.length, present: rows.filter(row => row.status === "present").length, absent: rows.filter(row => row.status === "absent").length, unmarked: rows.filter(row => !row.status).length, notifications: rows.filter(row => row.notificationStatus).length };
  return { event, totals, rows };
}

export async function listAbsenceNotifications() {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: absenceNotifications.id, attendanceId: absenceNotifications.attendanceId, youthId: youths.id, youthName: youths.name, discipulatorId: discipulators.id, discipulatorName: discipulators.name, recipient: absenceNotifications.recipient, body: absenceNotifications.body, status: absenceNotifications.status, providerMessageId: absenceNotifications.providerMessageId, error: absenceNotifications.error, createdAt: absenceNotifications.createdAt, sentAt: absenceNotifications.sentAt, eventDate: worshipEvents.eventDate, eventType: worshipEvents.eventType }).from(absenceNotifications).innerJoin(attendance, eq(absenceNotifications.attendanceId, attendance.id)).innerJoin(youths, eq(absenceNotifications.youthId, youths.id)).leftJoin(discipulators, eq(absenceNotifications.discipulatorId, discipulators.id)).innerJoin(worshipEvents, eq(attendance.eventId, worshipEvents.id)).orderBy(desc(absenceNotifications.createdAt)).limit(200);
}

export async function listAbsences() {
  const db = await getDb(); if (!db) return [];
  return db.select({ attendanceId: attendance.id, youthId: youths.id, youthName: youths.name, discipulatorId: discipulators.id, discipulatorName: discipulators.name, recipient: absenceNotifications.recipient, notificationStatus: absenceNotifications.status, notificationError: absenceNotifications.error, attendanceStatus: attendance.status, eventDate: worshipEvents.eventDate, eventType: worshipEvents.eventType, recordedAt: attendance.recordedAt }).from(attendance).innerJoin(youths, eq(attendance.youthId, youths.id)).leftJoin(discipulators, eq(youths.discipulatorId, discipulators.id)).leftJoin(absenceNotifications, eq(absenceNotifications.attendanceId, attendance.id)).innerJoin(worshipEvents, eq(attendance.eventId, worshipEvents.id)).where(eq(attendance.status, "absent")).orderBy(desc(attendance.recordedAt)).limit(200);
}

export async function getAbsenceNotificationSummary() {
  const db = await getDb(); if (!db) return { total: 0, pending: 0, sending: 0, sent: 0, error: 0, cancelled: 0 };
  const rows = await db.select({ status: absenceNotifications.status, count: sql<number>`count(*)` }).from(absenceNotifications).groupBy(absenceNotifications.status);
  const summary = { total: 0, pending: 0, sending: 0, sent: 0, error: 0, cancelled: 0 };
  for (const row of rows) { const count = Number(row.count ?? 0); summary[row.status] = count; summary.total += count; }
  return summary;
}


export type ReportFilters = {
  startDate: string;
  endDate: string;
  eventType?: string;
  discipulatorId?: number;
  youthId?: number;
  lowFrequencyThreshold?: number;
  maxConsecutiveAbsences?: number;
};

function dateKey(value: unknown) { return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10); }

function addDaysToDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function ratioPercent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

async function collectReportRows(filters: ReportFilters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [gte(worshipEvents.eventDate, new Date(filters.startDate)), lt(worshipEvents.eventDate, new Date(`${addDaysToDate(filters.endDate, 1)}T12:00:00`))];
  if (filters.eventType) conditions.push(eq(worshipEvents.eventType, filters.eventType));
  if (filters.discipulatorId) conditions.push(eq(youths.discipulatorId, filters.discipulatorId));
  if (filters.youthId) conditions.push(eq(youths.id, filters.youthId));
  return db.select({ attendanceId: attendance.id, status: attendance.status, eventDate: worshipEvents.eventDate, eventType: worshipEvents.eventType, youthId: youths.id, youthName: youths.name, youthCreatedAt: youths.createdAt, discipleshipStartDate: youths.discipleshipStartDate, discipulatorId: discipulators.id, discipulatorName: discipulators.name, followUpStatus: followUps.status, notificationStatus: absenceNotifications.status }).from(attendance).innerJoin(worshipEvents, eq(attendance.eventId, worshipEvents.id)).innerJoin(youths, eq(attendance.youthId, youths.id)).leftJoin(discipulators, eq(youths.discipulatorId, discipulators.id)).leftJoin(followUps, eq(followUps.attendanceId, attendance.id)).leftJoin(absenceNotifications, eq(absenceNotifications.attendanceId, attendance.id)).where(and(...conditions)).orderBy(asc(worshipEvents.eventDate), asc(youths.name));
}

export function aggregateReportRows(rows: any[]) {
  const present = rows.filter(row => row.status === "present").length;
  const absent = rows.filter(row => row.status === "absent").length;
  const marked = present + absent;
  const events = new Map<string, { eventDate: string; eventType: string; present: number; absent: number }>();
  const youthMap = new Map<number, any>();
  const discipulatorMap = new Map<number, any>();
  for (const row of rows) {
    const eventKey = `${row.eventDate}|${row.eventType}`;
    const event = events.get(eventKey) ?? { eventDate: dateKey(row.eventDate), eventType: row.eventType, present: 0, absent: 0 };
    if (row.status === "present") event.present += 1;
    if (row.status === "absent") event.absent += 1;
    events.set(eventKey, event);
    const youth = youthMap.get(row.youthId) ?? { youthId: row.youthId, youthName: row.youthName, discipulatorId: row.discipulatorId, discipulatorName: row.discipulatorName, present: 0, absent: 0, lastPresence: null as string | null, followUpStatuses: [] as string[], history: [] as any[], consecutiveAbsences: 0 };
    if (row.status === "present") { youth.present += 1; youth.lastPresence = dateKey(row.eventDate); youth.consecutiveAbsences = 0; }
    if (row.status === "absent") { youth.absent += 1; youth.consecutiveAbsences += 1; }
    youth.history.push({ eventDate: dateKey(row.eventDate), eventType: row.eventType, status: row.status, followUpStatus: row.followUpStatus ?? null });
    if (row.followUpStatus) youth.followUpStatuses.push(row.followUpStatus);
    youthMap.set(row.youthId, youth);
    if (row.discipulatorId) {
      const discipulator = discipulatorMap.get(row.discipulatorId) ?? { discipulatorId: row.discipulatorId, discipulatorName: row.discipulatorName, present: 0, absent: 0, followUps: 0, youthIds: new Set<number>() };
      discipulator.youthIds.add(row.youthId);
      if (row.status === "present") discipulator.present += 1;
      if (row.status === "absent") discipulator.absent += 1;
      if (row.followUpStatus && row.followUpStatus !== "pending") discipulator.followUps += 1;
      discipulatorMap.set(row.discipulatorId, discipulator);
    }
  }
  const ranking = Array.from(youthMap.values()).map(youth => ({ ...youth, frequency: ratioPercent(youth.present, youth.present + youth.absent), consecutiveAbsences: youth.consecutiveAbsences, followUpStatus: youth.followUpStatuses.at(-1) ?? null }));
  const discipulators = Array.from(discipulatorMap.values()).map(item => ({ discipulatorId: item.discipulatorId, discipulatorName: item.discipulatorName, disciples: item.youthIds.size, present: item.present, absent: item.absent, frequency: ratioPercent(item.present, item.present + item.absent), followUps: item.followUps, history: Array.from(rows.filter(row => row.discipulatorId === item.discipulatorId).reduce((map, row) => { const key = `${dateKey(row.eventDate)}|${row.eventType}`; const current = map.get(key) ?? { eventDate: dateKey(row.eventDate), eventType: row.eventType, present: 0, absent: 0 }; if (row.status === "present") current.present += 1; if (row.status === "absent") current.absent += 1; map.set(key, current); return map; }, new Map<string, any>()).values()).map((event: any) => ({ ...event, frequency: ratioPercent(event.present, event.present + event.absent) })), youthRows: ranking.filter(youth => item.youthIds.has(youth.youthId)).map(youth => ({ youthId: youth.youthId, youthName: youth.youthName, present: youth.present, absent: youth.absent, frequency: youth.frequency, lastPresence: youth.lastPresence, followUpStatus: youth.followUpStatus, history: youth.history, consecutiveAbsences: youth.consecutiveAbsences })) }));
  return { present, absent, marked, frequency: ratioPercent(present, marked), events: Array.from(events.values()), ranking, discipulators };
}

export async function getReports(filters: ReportFilters, scopeDiscipulatorId?: number) {
  const db = await getDb();
  if (!db) return { filters, comparison: null, summary: { frequency: null, averagePresence: 0, absences: 0, activeYouth: 0, newYouth: 0, followUps: 0, followedAbsences: 0 }, events: [], ranking: [], discipulators: [], alerts: [], enoughData: false };
  const scopedFilters = scopeDiscipulatorId ? { ...filters, discipulatorId: scopeDiscipulatorId } : filters;
  const rows = await collectReportRows(scopedFilters);
  const aggregate = aggregateReportRows(rows);
  const start = new Date(`${filters.startDate}T12:00:00`);
  const end = new Date(`${filters.endDate}T12:00:00`);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = addDaysToDate(filters.startDate, -1);
  const previousStart = addDaysToDate(previousEnd, -(duration - 1));
  const previous = aggregateReportRows(await collectReportRows({ ...scopedFilters, startDate: previousStart, endDate: previousEnd }));
  const activeConditions = [eq(youths.relationshipStatus, "active")];
  if (scopeDiscipulatorId) activeConditions.push(eq(youths.discipulatorId, scopeDiscipulatorId));
  else if (filters.discipulatorId) activeConditions.push(eq(youths.discipulatorId, filters.discipulatorId));
  if (filters.youthId) activeConditions.push(eq(youths.id, filters.youthId));
  const activeRows = await db.select({ id: youths.id, discipleshipStartDate: youths.discipleshipStartDate }).from(youths).where(and(...activeConditions));
  const newYouth = activeRows.filter(row => dateKey(row.discipleshipStartDate) >= filters.startDate && dateKey(row.discipleshipStartDate) <= filters.endDate).length;
  const followedAbsences = rows.filter(row => row.status === "absent" && row.followUpStatus && row.followUpStatus !== "pending").length;
  const currentFrequency = aggregate.frequency;
  const previousFrequency = previous.frequency;
  const delta = currentFrequency !== null && previousFrequency !== null ? Math.round((currentFrequency - previousFrequency) * 10) / 10 : null;
  const lowFrequencyThreshold = filters.lowFrequencyThreshold ?? 60;
  const maxConsecutiveAbsences = filters.maxConsecutiveAbsences ?? 2;
  const alerts = aggregate.ranking.filter(row => (row.frequency !== null && row.frequency < lowFrequencyThreshold) || row.consecutiveAbsences >= maxConsecutiveAbsences).slice(0, 12).map(row => ({ youthId: row.youthId, youthName: row.youthName, discipulatorName: row.discipulatorName, frequency: row.frequency, absences: row.absent, message: row.consecutiveAbsences >= maxConsecutiveAbsences ? `${row.consecutiveAbsences} faltas consecutivas` : `Frequência abaixo de ${lowFrequencyThreshold}%` }));
  const monthlyMap = new Map<string, { month: string; present: number; absent: number }>();
  for (const row of rows) { const month = dateKey(row.eventDate).slice(0, 7); const item = monthlyMap.get(month) ?? { month, present: 0, absent: 0 }; if (row.status === "present") item.present += 1; if (row.status === "absent") item.absent += 1; monthlyMap.set(month, item); }
  const monthlyTrend = Array.from(monthlyMap.values()).map(item => ({ ...item, frequency: ratioPercent(item.present, item.present + item.absent) }));
  const enoughMonthlyData = monthlyTrend.filter(item => item.present + item.absent > 0).length >= 2;
  const movement = { newYouth, recurrent: aggregate.ranking.filter(row => row.present >= 2).length, consecutive: aggregate.ranking.filter(row => row.consecutiveAbsences >= maxConsecutiveAbsences).length, prolongedAbsence: aggregate.ranking.filter(row => row.present === 0 && row.absent >= maxConsecutiveAbsences).length };
  return { filters: { ...filters, previousStart, previousEnd }, summary: { frequency: currentFrequency, averagePresence: aggregate.events.length ? Math.round(aggregate.events.reduce((total, event) => total + event.present, 0) / aggregate.events.length) : 0, absences: aggregate.absent, activeYouth: activeRows.length, newYouth, followUps: rows.filter(row => row.status === "absent" && row.followUpStatus).length, followedAbsences, followUpRate: ratioPercent(followedAbsences, aggregate.absent) }, comparison: { currentFrequency, previousFrequency, delta, direction: delta === null ? "insufficient" : delta > 1 ? "growth" : delta < -1 ? "decline" : "stable", current: { startDate: filters.startDate, endDate: filters.endDate }, previous: { startDate: previousStart, endDate: previousEnd } }, events: aggregate.events, monthlyTrend, enoughMonthlyData, movement, ranking: aggregate.ranking, discipulators: aggregate.discipulators, alerts, enoughData: aggregate.events.length >= 2 };
}
