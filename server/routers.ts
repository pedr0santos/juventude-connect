import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { absenceNotifications, appSettings, attendance, discipulators, followUps, messageLogs, users, worshipEvents, youths } from "../drizzle/schema";
import { getAbsenceNotificationSummary, getAttendanceSummary, getDashboardData, getDb, getReports, getSettings, listAbsenceNotifications, listAbsences, listAttendance, listDiscipulators, listMessageLogs, listYouths } from "./db";
import { makeBirthdayReference, renderTemplate } from "./automation";
import { sendWhatsAppTemplate } from "./whatsapp";
import { canAccessScopedData } from "./access";
import { normalizeImportText, selectYouthIdsForAliasRelink } from "./importRules";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao administrador." });
  return next();
});

const linkedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canAccessScopedData(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta ainda não está vinculada a um discipulador." });
  return next();
});

const youthInput = z.object({ name: z.string().min(2), birthDate: z.string(), whatsapp: z.string().default(""), address: z.string().optional(), photoUrl: z.string().optional(), notes: z.string().optional(), discipulatorId: z.number().int().positive().nullable().optional(), discipleshipStartDate: z.string(), relationshipStatus: z.enum(["active", "inactive"]).default("active") });

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }) }),
  accounts: router({ list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, discipulatorId: users.discipulatorId }).from(users).orderBy(users.name); }), linkDiscipulator: adminProcedure.input(z.object({ userId: z.number().int(), discipulatorId: z.number().int().nullable() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(users).set({ discipulatorId: input.discipulatorId, role: input.discipulatorId ? "discipulator" : "user" }).where(eq(users.id, input.userId)); return { success: true }; }) }),
  dashboard: linkedProcedure.query(({ ctx }) => getDashboardData(ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)),
  reports: router({ get: linkedProcedure.input(z.object({ startDate: z.string(), endDate: z.string(), eventType: z.string().optional(), discipulatorId: z.number().optional(), youthId: z.number().optional(), lowFrequencyThreshold: z.number().min(1).max(100).optional(), maxConsecutiveAbsences: z.number().int().min(1).max(20).optional() })).query(({ input, ctx }) => getReports(input, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)) }),
  youths: router({
    list: linkedProcedure.input(z.object({ search: z.string().optional(), discipulatorId: z.number().optional(), ageMin: z.number().optional(), ageMax: z.number().optional(), sort: z.enum(["name", "birthday"]).default("name") }).optional()).query(({ input, ctx }) => listYouths(input?.search, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : input?.discipulatorId, input?.ageMin, input?.ageMax, input?.sort)),
    create: adminProcedure.input(youthInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [row] = await db.insert(youths).values({ ...input, birthDate: new Date(input.birthDate), discipleshipStartDate: new Date(input.discipleshipStartDate) }); return { id: row.insertId }; }),
    update: adminProcedure.input(youthInput.extend({ id: z.number().int() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { id, ...data } = input; await db.update(youths).set({ ...data, birthDate: new Date(data.birthDate), discipleshipStartDate: new Date(data.discipleshipStartDate) }).where(eq(youths.id, id)); return { success: true }; }),
    updateWhatsapp: adminProcedure.input(z.object({ id: z.number().int(), whatsapp: z.string().default("") })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ whatsapp: input.whatsapp.replace(/\\D/g, "") }).where(eq(youths.id, input.id)); return { success: true }; }),
    reassign: adminProcedure.input(z.object({ id: z.number().int(), discipulatorId: z.number().int().positive().nullable() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ discipulatorId: input.discipulatorId }).where(eq(youths.id, input.id)); return { success: true }; }),
    remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ relationshipStatus: "inactive" }).where(eq(youths.id, input.id)); return { success: true }; }),
    bulkCreate: adminProcedure.input(z.object({ rows: z.array(youthInput) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); if (!input.rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma linha válida foi encontrada." }); await db.insert(youths).values(input.rows.map(row => ({ ...row, birthDate: new Date(row.birthDate), discipleshipStartDate: new Date(row.discipleshipStartDate) }))); return { imported: input.rows.length }; }),
  }),
  discipulators: router({
    list: linkedProcedure.query(({ ctx }) => ctx.user.role === "discipulator" && ctx.user.discipulatorId ? listDiscipulators().then(rows => rows.filter(row => row.id === ctx.user.discipulatorId)) : listDiscipulators()),
    create: adminProcedure.input(z.object({ name: z.string().min(2), whatsapp: z.string().min(8), status: z.enum(["active", "inactive"]).default("active"), notes: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.insert(discipulators).values(input); return { success: true }; }),
    updateAliases: adminProcedure.input(z.object({ id: z.number().int(), aliases: z.array(z.string().min(1)).max(20) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [discipulator] = await db.select().from(discipulators).where(eq(discipulators.id, input.id)).limit(1); if (!discipulator) throw new TRPCError({ code: "NOT_FOUND" }); const aliasText = input.aliases.map(normalizeImportText).filter(Boolean).join(", "); await db.update(discipulators).set({ notes: `Apelidos: ${aliasText}` }).where(eq(discipulators.id, input.id)); const pending = await db.select({ id: youths.id, notes: youths.notes }).from(youths).where(sql`${youths.discipulatorId} is null`); const youthIds = selectYouthIdsForAliasRelink(pending, input.aliases); for (const youthId of youthIds) await db.update(youths).set({ discipulatorId: input.id }).where(eq(youths.id, youthId)); return { success: true, linked: youthIds.length }; }),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), whatsapp: z.string().min(8), status: z.enum(["active", "inactive"]), notes: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { id, ...data } = input; await db.update(discipulators).set(data).where(eq(discipulators.id, id)); return { success: true }; }),
  }),
  attendance: router({
    list: linkedProcedure.input(z.object({ eventDate: z.string(), eventType: z.string() })).query(({ input, ctx }) => listAttendance(input.eventDate, input.eventType).then(async rows => { if (ctx.user.role !== "discipulator" || !ctx.user.discipulatorId) return rows; const db = await getDb(); if (!db) return []; const allowed = await db.select({ id: youths.id }).from(youths).where(eq(youths.discipulatorId, ctx.user.discipulatorId)); const ids = new Set(allowed.map(row => row.id)); return rows.filter(row => ids.has(row.youthId)); })),
    summary: linkedProcedure.input(z.object({ eventDate: z.string(), eventType: z.string() })).query(({ input, ctx }) => getAttendanceSummary(input.eventDate, input.eventType, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)),
    markAbsence: adminProcedure.input(z.object({ eventDate: z.string(), eventType: z.string(), youthId: z.number(), absent: z.boolean() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let [event] = await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, new Date(input.eventDate)), eq(worshipEvents.eventType, input.eventType))).limit(1);
      if (!event) { await db.insert(worshipEvents).values({ eventDate: new Date(input.eventDate), eventType: input.eventType }); [event] = await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, new Date(input.eventDate)), eq(worshipEvents.eventType, input.eventType))).limit(1); }
      const [youth] = await db.select({ id: youths.id, name: youths.name, discipulatorId: youths.discipulatorId }).from(youths).where(eq(youths.id, input.youthId)).limit(1);
      if (!youth) throw new TRPCError({ code: "NOT_FOUND", message: "Jovem não encontrado." });
      const [discipulator] = youth.discipulatorId ? await db.select().from(discipulators).where(eq(discipulators.id, youth.discipulatorId)).limit(1) : [];
      const existing = await db.select().from(attendance).where(and(eq(attendance.eventId, event.id), eq(attendance.youthId, input.youthId))).limit(1);
      if (existing[0]) {
        await db.update(attendance).set({ status: input.absent ? "absent" : "present", correctedAt: new Date() }).where(eq(attendance.id, existing[0].id));
        if (!input.absent) { await db.update(absenceNotifications).set({ status: "cancelled", error: "Falta corrigida para presente." }).where(eq(absenceNotifications.attendanceId, existing[0].id)); return { success: true, notification: "presença corrigida e notificação cancelada", notificationId: null }; }
        const existingNotification = await db.select().from(absenceNotifications).where(eq(absenceNotifications.attendanceId, existing[0].id)).limit(1);
        if (existingNotification[0]) return { success: true, notification: "falta já registrada; notificação preservada", notificationId: existingNotification[0].id };
      }
      let attendanceId = existing[0]?.id;
      if (!attendanceId) { const [created] = await db.insert(attendance).values({ eventId: event.id, youthId: input.youthId, status: "absent" }); attendanceId = created.insertId; }
      if (youth.discipulatorId) { const followUp = await db.select().from(followUps).where(eq(followUps.attendanceId, attendanceId)).limit(1); if (!followUp[0]) await db.insert(followUps).values({ attendanceId, youthId: input.youthId, discipulatorId: youth.discipulatorId }); }
      const body = renderTemplate("Olá, {{discipulador}}. O seu discípulo {{discipulo}} faltou ao culto de {{culto}} em {{data}}. Procure saber como ele está e entre em contato com ele.", { discipulador: discipulator?.name ?? "Discipulador", discipulo: youth.name, culto: input.eventType, data: input.eventDate });
      const [notification] = await db.insert(absenceNotifications).values({ attendanceId, youthId: input.youthId, discipulatorId: discipulator?.id ?? null, recipient: discipulator?.whatsapp ?? null, body, status: discipulator ? "pending" : "error", error: discipulator ? null : "Discipulador não encontrado" });
      return { success: true, notification: discipulator ? "falta registrada e notificação criada" : "falta registrada; discipulador não encontrado", notificationId: notification.insertId, notificationStatus: discipulator ? "pending" : "error", youthName: youth.name, discipulatorName: discipulator?.name ?? null, recipient: discipulator?.whatsapp ?? null, body };
    }),
    updateFollowUp: linkedProcedure.input(z.object({ id: z.number(), status: z.enum(["pending", "contacted", "talked", "justification", "resolved"]), notes: z.string().optional() })).mutation(async ({ input, ctx }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const current = await db.select({ discipulatorId: followUps.discipulatorId }).from(followUps).where(eq(followUps.id, input.id)).limit(1); if (!current[0] || (ctx.user.role === "discipulator" && current[0].discipulatorId !== ctx.user.discipulatorId)) throw new TRPCError({ code: "FORBIDDEN", message: "Este acompanhamento não pertence à sua carteira." }); await db.update(followUps).set({ status: input.status, notes: input.notes, lastContactAt: new Date() }).where(eq(followUps.id, input.id)); return { success: true }; }),
  }),
  absences: router({
    list: adminProcedure.query(() => listAbsences()),
    summary: adminProcedure.query(() => getAbsenceNotificationSummary()),
  }),
  notifications: router({
    list: adminProcedure.query(() => listAbsenceNotifications()),
    summary: adminProcedure.query(() => getAbsenceNotificationSummary()),
    send: adminProcedure.input(z.object({ id: z.number().int(), templateName: z.string().min(1), languageCode: z.string().default("pt_BR") })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [notification] = await db.select().from(absenceNotifications).where(eq(absenceNotifications.id, input.id)).limit(1);
      const settings = await getSettings();
      if (!notification) throw new TRPCError({ code: "NOT_FOUND", message: "Notificação não encontrada." });
      if (notification.status === "sent") return { success: false, duplicate: true, message: "Esta notificação já foi enviada." };
      if (!notification.recipient) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Não há WhatsApp de destino cadastrado." });
      await db.update(absenceNotifications).set({ status: "sending", error: null }).where(eq(absenceNotifications.id, input.id));
      const result = await sendWhatsAppTemplate({ token: settings?.whatsappToken ?? "", phoneNumberId: settings?.whatsappPhoneNumberId ?? "", recipient: notification.recipient, templateName: input.templateName, languageCode: input.languageCode, parameters: [] });
      if (!result.ok) { await db.update(absenceNotifications).set({ status: "error", error: result.error }).where(eq(absenceNotifications.id, input.id)); throw new TRPCError({ code: "BAD_REQUEST", message: result.error }); }
      await db.update(absenceNotifications).set({ status: "sent", providerMessageId: result.messageId, sentAt: new Date() }).where(eq(absenceNotifications.id, input.id));
      return { success: true, providerMessageId: result.messageId };
    }),
  }),
  settings: router({ get: adminProcedure.query(() => getSettings()), status: adminProcedure.query(async () => { const settings = await getSettings(); const missingFields = [!settings?.whatsappPhoneNumberId ? "phone_number_id" : null, !settings?.whatsappBusinessAccountId ? "business_account_id" : null, !settings?.whatsappToken ? "token" : null].filter(Boolean); return { enabled: settings?.whatsappEnabled === "enabled", configured: missingFields.length === 0, missingFields }; }), update: adminProcedure.input(z.object({ birthdayTemplate: z.string().min(5), absenceTemplate: z.string().min(5), whatsappPhoneNumberId: z.string().optional(), whatsappBusinessAccountId: z.string().optional(), whatsappToken: z.string().optional(), whatsappEnabled: z.enum(["enabled", "disabled"]) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const current = await getSettings(); if (current) await db.update(appSettings).set(input).where(eq(appSettings.id, current.id)); else await db.insert(appSettings).values(input); return { success: true }; }),
  }),
  messages: router({ list: adminProcedure.query(() => listMessageLogs()), prepareBirthday: adminProcedure.input(z.object({ youthId: z.number() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [youth] = await db.select().from(youths).where(eq(youths.id, input.youthId)).limit(1); if (!youth) throw new TRPCError({ code: "NOT_FOUND" }); const settings = await getSettings(); const age = Math.max(0, new Date().getFullYear() - new Date(youth.birthDate).getFullYear()); const body = renderTemplate(settings?.birthdayTemplate ?? "Olá, {{nome}}! Feliz aniversário!", { nome: youth.name, idade: age }); const referenceKey = makeBirthdayReference(youth.id); const [existing] = await db.select().from(messageLogs).where(and(eq(messageLogs.messageType, "birthday"), eq(messageLogs.referenceKey, referenceKey))).limit(1); if (existing) return { success: false, duplicate: true, body }; await db.insert(messageLogs).values({ youthId: youth.id, messageType: "birthday", referenceKey, recipient: youth.whatsapp, body, status: "pending" }); return { success: true, body, recipient: youth.whatsapp }; }), sendBirthday: adminProcedure.input(z.object({ youthId: z.number(), templateName: z.string().min(1), languageCode: z.string().default("pt_BR") })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [youth] = await db.select().from(youths).where(eq(youths.id, input.youthId)).limit(1); const settings = await getSettings(); if (!youth || !settings) throw new TRPCError({ code: "NOT_FOUND" }); const age = Math.max(0, new Date().getFullYear() - new Date(youth.birthDate).getFullYear()); const referenceKey = makeBirthdayReference(youth.id); const [log] = await db.select().from(messageLogs).where(and(eq(messageLogs.messageType, "birthday"), eq(messageLogs.referenceKey, referenceKey))).limit(1); if (!log) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Prepare a mensagem antes do envio." }); const result = await sendWhatsAppTemplate({ token: settings.whatsappToken ?? "", phoneNumberId: settings.whatsappPhoneNumberId ?? "", recipient: youth.whatsapp, templateName: input.templateName, languageCode: input.languageCode, parameters: [youth.name, String(age)] }); if (!result.ok) { await db.update(messageLogs).set({ status: "failed", error: result.error }).where(eq(messageLogs.id, log.id)); throw new TRPCError({ code: "BAD_REQUEST", message: result.error }); } await db.update(messageLogs).set({ status: "sent", providerMessageId: result.messageId, sentAt: new Date() }).where(eq(messageLogs.id, log.id)); return { success: true, providerMessageId: result.messageId }; }),
  }),
});
export type AppRouter = typeof appRouter;
