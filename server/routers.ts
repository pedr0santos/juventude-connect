import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { absenceNotifications, appSettings, attendance, discipulatorResponsibles, discipulators, followUps, messageLogs, users, worshipEvents, youths } from "../drizzle/schema";
import { getAbsenceNotificationSummary, getAttendanceSummary, getDashboardData, getDb, getReports, getSettings, listAbsenceNotifications, listAbsences, listAttendance, listDiscipulators, listMessageLogs, listYouths } from "./db";
import { makeBirthdayReference, renderTemplate } from "./automation";
import { sendWhatsAppTemplate } from "./whatsapp";
import { canAccessScopedData } from "./access";
import { normalizeImportText, selectYouthIdsForAliasRelink } from "./importRules";
import { COOKIE_NAME, WORSHIP_EVENT_TYPES } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { consumePasswordResetToken, createPasswordResetToken, createSession, hashPassword, normalizeEmail, revokeSession, revokeUserSessions, toPublicUser, validatePassword, verifyPassword } from "./auth";
import { sendPasswordResetEmail } from "./mailer";
import { calendarDate, calendarDateValue } from "@shared/calendar";
import { importDiscipulatorsWorkbook, importYouthsWorkbook } from "./workbookImport";
import { storagePut } from "./storage";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao administrador." });
  return next();
});

const linkedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canAccessScopedData(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta ainda não está vinculada a um discipulador." });
  return next();
});

const youthInput = z.object({ name: z.string().min(2), birthDate: z.string(), whatsapp: z.string().default(""), address: z.string().optional(), photoUrl: z.string().optional(), notes: z.string().optional(), discipulatorId: z.number().int().positive().nullable().optional(), discipleshipStartDate: z.string(), relationshipStatus: z.enum(["active", "inactive"]).default("active") });
const profilePhotoInput = z.object({ id: z.number().int(), dataBase64: z.string().min(20), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]) });

function formatWorkbookImportError(error: unknown) {
  const details = error as { cause?: unknown; code?: unknown; errno?: unknown; sqlState?: unknown; message?: unknown };
  const cause = details.cause as { code?: unknown; errno?: unknown; sqlState?: unknown; message?: unknown } | undefined;
  const message = typeof cause?.message === "string" ? cause.message : typeof details.message === "string" ? details.message : "erro desconhecido";
  if (message.startsWith("Importação cancelada:")) return message;
  const diagnostics = [
    cause?.code ?? details.code,
    cause?.sqlState ?? details.sqlState,
    cause?.errno ?? details.errno,
  ].filter(value => value !== undefined && value !== null).join(" / ");
  return `A importação foi cancelada: ${message}${diagnostics ? ` [${diagnostics}]` : ""}`;
}

async function saveProfilePhoto(id: number, dataBase64: string, contentType: string, kind: "youth" | "discipulator") {
  const data = Buffer.from(dataBase64, "base64");
  if (data.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A foto deve ter no máximo 8 MB." });
  return storagePut(`profiles/${kind}/${id}`, data, contentType);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? toPublicUser(opts.ctx.user) : null),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const email = normalizeEmail(input.email);
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
      if (user.accountStatus === "pending") throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta aguarda aprovação do administrador." });
      if (user.accountStatus === "suspended") throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta está suspensa." });
      const token = await createSession(user.id);
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 7 });
      return toPublicUser(user);
    }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().email(), password: z.string().min(8).max(128), passwordConfirmation: z.string() })).mutation(async ({ input }) => {
      if (!validatePassword(input.password) || input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "Confira a senha e a confirmação. A senha deve ter pelo menos 8 caracteres." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const email = normalizeEmail(input.email);
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Não foi possível criar a conta com esses dados." });
      await db.insert(users).values({ name: input.name, email, passwordHash: await hashPassword(input.password), accountStatus: "pending", loginMethod: "local", role: "user" });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookies = ctx.req.headers.cookie ? ctx.req.headers.cookie.split(";").map(value => value.trim()) : [];
      const sessionToken = cookies.find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
      await revokeSession(sessionToken);
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128), newPasswordConfirmation: z.string() })).mutation(async ({ input, ctx }) => {
      if (!ctx.user.passwordHash || !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) throw new TRPCError({ code: "BAD_REQUEST", message: "A senha atual está incorreta." });
      if (!validatePassword(input.newPassword) || input.newPassword !== input.newPasswordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "Confira a nova senha e a confirmação." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, ctx.user.id));
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1);
        if (user?.email) {
          const token = await createPasswordResetToken(user.id);
          await sendPasswordResetEmail(user.email, token);
        }
      }
      return { success: true, message: "Se houver uma conta para este e-mail, enviaremos as instruções de recuperação." } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: z.string().min(8).max(128), passwordConfirmation: z.string() })).mutation(async ({ input }) => {
      if (!validatePassword(input.password) || input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "Confira a nova senha e a confirmação." });
      const userId = await consumePasswordResetToken(input.token);
      if (!userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Este link é inválido ou expirou." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      await db.update(users).set({ passwordHash: await hashPassword(input.password), accountStatus: "active" }).where(eq(users.id, userId));
      await revokeUserSessions(userId);
      return { success: true } as const;
    }),
  }),
  accounts: router({
    list: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, discipulatorId: users.discipulatorId, createdAt: users.createdAt }).from(users).orderBy(users.name); }),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().email(), password: z.string().min(8).max(128), role: z.enum(["user", "admin", "discipulator"]).default("user"), discipulatorId: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const email = normalizeEmail(input.email);
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado." });
      await db.insert(users).values({ name: input.name, email, passwordHash: await hashPassword(input.password), accountStatus: "active", loginMethod: "local", role: input.role, discipulatorId: input.discipulatorId ?? null });
      return { success: true } as const;
    }),
    updateStatus: adminProcedure.input(z.object({ userId: z.number().int(), accountStatus: z.enum(["pending", "active", "suspended"]) })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id && input.accountStatus !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desativar sua própria conta." });
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "admin" && input.accountStatus !== "active") {
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "admin"), eq(users.accountStatus, "active")));
        if (Number(count) <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "O sistema precisa manter pelo menos um administrador ativo." });
      }
      await db.update(users).set({ accountStatus: input.accountStatus }).where(eq(users.id, input.userId));
      if (input.accountStatus !== "active") await revokeUserSessions(input.userId);
      return { success: true } as const;
    }),
    linkDiscipulator: adminProcedure.input(z.object({ userId: z.number().int(), discipulatorId: z.number().int().nullable() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(users).set({ discipulatorId: input.discipulatorId, role: input.discipulatorId ? "discipulator" : "user" }).where(eq(users.id, input.userId)); return { success: true }; }),
  }),
  dashboard: linkedProcedure.query(({ ctx }) => getDashboardData(ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)),
  reports: router({ get: linkedProcedure.input(z.object({ startDate: z.string(), endDate: z.string(), eventType: z.string().optional(), discipulatorId: z.number().optional(), youthId: z.number().optional(), lowFrequencyThreshold: z.number().min(1).max(100).optional(), maxConsecutiveAbsences: z.number().int().min(1).max(20).optional() })).query(({ input, ctx }) => getReports(input, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)) }),
  youths: router({
    list: linkedProcedure.input(z.object({ search: z.string().optional(), discipulatorId: z.number().optional(), ageMin: z.number().optional(), ageMax: z.number().optional(), sort: z.enum(["name", "birthday"]).default("name") }).optional()).query(({ input, ctx }) => listYouths(input?.search, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : input?.discipulatorId, input?.ageMin, input?.ageMax, input?.sort)),
    checkWhatsapp: linkedProcedure.input(z.object({ whatsapp: z.string().regex(/^\d{10,11}$/, "Informe DDD + número, com 10 ou 11 dígitos.") })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const normalized = input.whatsapp.replace(/\D/g, "");
      const [existing] = await db.select({ name: youths.name }).from(youths).where(sql`regexp_replace(${youths.whatsapp}, '[^0-9]', '') = ${normalized}`).limit(1);
      return { exists: Boolean(existing), name: existing?.name ?? null };
    }),
    createForDiscipulator: linkedProcedure.input(youthInput.omit({ discipulatorId: true, relationshipStatus: true }).extend({ whatsapp: z.string().regex(/^\d{10,11}$/, "Informe DDD + número, com 10 ou 11 dígitos.") })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "discipulator" || !ctx.user.discipulatorId) throw new TRPCError({ code: "FORBIDDEN", message: "Somente um discipulador vinculado pode cadastrar jovens por esta rota." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
      const normalized = input.whatsapp.replace(/\D/g, "");
      const [existing] = await db.select({ name: youths.name }).from(youths).where(sql`regexp_replace(${youths.whatsapp}, '[^0-9]', '') = ${normalized}`).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: `Jovem ${existing.name} já cadastrado no sistema.` });
      const [row] = await db.insert(youths).values({ ...input, whatsapp: normalized, discipulatorId: ctx.user.discipulatorId, relationshipStatus: "active", birthDate: calendarDateValue(input.birthDate), discipleshipStartDate: calendarDateValue(input.discipleshipStartDate) });
      return { id: row.insertId };
    }),
    create: adminProcedure.input(youthInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [row] = await db.insert(youths).values({ ...input, birthDate: calendarDateValue(input.birthDate), discipleshipStartDate: calendarDateValue(input.discipleshipStartDate) }); return { id: row.insertId }; }),
    update: adminProcedure.input(youthInput.extend({ id: z.number().int() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const { id, ...data } = input; await db.update(youths).set({ ...data, birthDate: calendarDateValue(data.birthDate), discipleshipStartDate: calendarDateValue(data.discipleshipStartDate) }).where(eq(youths.id, id)); return { success: true }; }),
    updateWhatsapp: adminProcedure.input(z.object({ id: z.number().int(), whatsapp: z.string().default("") })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ whatsapp: input.whatsapp.replace(/\\D/g, "") }).where(eq(youths.id, input.id)); return { success: true }; }),
    reassign: adminProcedure.input(z.object({ id: z.number().int(), discipulatorId: z.number().int().positive().nullable() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ discipulatorId: input.discipulatorId }).where(eq(youths.id, input.id)); return { success: true }; }),
    remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(youths).set({ relationshipStatus: "inactive" }).where(eq(youths.id, input.id)); return { success: true }; }),
    bulkCreate: adminProcedure.input(z.object({ rows: z.array(youthInput) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); if (!input.rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma linha válida foi encontrada." }); await db.insert(youths).values(input.rows.map(row => ({ ...row, birthDate: calendarDateValue(row.birthDate), discipleshipStartDate: calendarDateValue(row.discipleshipStartDate) }))); return { imported: input.rows.length }; }),
    importWorkbook: adminProcedure.input(z.object({ fileBase64: z.string().min(20) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); try { return await importYouthsWorkbook(db, Buffer.from(input.fileBase64, "base64")); } catch (error) { const details = error as { cause?: unknown; code?: unknown; errno?: unknown; sqlState?: unknown; message?: unknown }; const cause = details.cause as { code?: unknown; errno?: unknown; sqlState?: unknown; message?: unknown } | undefined; console.error("[youths.importWorkbook] failed", { code: cause?.code ?? details.code, errno: cause?.errno ?? details.errno, sqlState: cause?.sqlState ?? details.sqlState, message: cause?.message ?? details.message }); throw new TRPCError({ code: "BAD_REQUEST", message: formatWorkbookImportError(error) }); } }),
    uploadPhoto: adminProcedure.input(profilePhotoInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [youth] = await db.select({ id: youths.id }).from(youths).where(eq(youths.id, input.id)).limit(1); if (!youth) throw new TRPCError({ code: "NOT_FOUND", message: "Jovem não encontrado." }); const uploaded = await saveProfilePhoto(input.id, input.dataBase64, input.contentType, "youth"); await db.update(youths).set({ photoUrl: uploaded.url }).where(eq(youths.id, input.id)); return uploaded; }),
  }),
  discipulators: router({
    list: linkedProcedure.query(({ ctx }) => ctx.user.role === "discipulator" && ctx.user.discipulatorId ? listDiscipulators().then(rows => rows.filter(row => row.id === ctx.user.discipulatorId)) : listDiscipulators()),
    responsibleOptions: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(discipulatorResponsibles).where(eq(discipulatorResponsibles.active, "yes")).orderBy(discipulatorResponsibles.name); }),
    create: adminProcedure.input(z.object({ name: z.string().min(2), whatsapp: z.string().min(8), status: z.enum(["active", "inactive"]).default("active"), notes: z.string().optional(), responsibleId: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); if (input.responsibleId) { const [responsible] = await db.select({ id: discipulatorResponsibles.id }).from(discipulatorResponsibles).where(and(eq(discipulatorResponsibles.id, input.responsibleId), eq(discipulatorResponsibles.active, "yes"))).limit(1); if (!responsible) throw new TRPCError({ code: "BAD_REQUEST", message: "Discipulador responsável não autorizado." }); } await db.insert(discipulators).values(input); return { success: true }; }),
    updateAliases: adminProcedure.input(z.object({ id: z.number().int(), aliases: z.array(z.string().min(1)).max(20) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [discipulator] = await db.select().from(discipulators).where(eq(discipulators.id, input.id)).limit(1); if (!discipulator) throw new TRPCError({ code: "NOT_FOUND" }); const aliasText = input.aliases.map(normalizeImportText).filter(Boolean).join(", "); await db.update(discipulators).set({ notes: `Apelidos: ${aliasText}` }).where(eq(discipulators.id, input.id)); const pending = await db.select({ id: youths.id, notes: youths.notes }).from(youths).where(sql`${youths.discipulatorId} is null`); const youthIds = selectYouthIdsForAliasRelink(pending, input.aliases); for (const youthId of youthIds) await db.update(youths).set({ discipulatorId: input.id }).where(eq(youths.id, youthId)); return { success: true, linked: youthIds.length }; }),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2), whatsapp: z.string().min(8), status: z.enum(["active", "inactive"]), notes: z.string().optional(), responsibleId: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); if (input.responsibleId) { const [responsible] = await db.select({ id: discipulatorResponsibles.id }).from(discipulatorResponsibles).where(and(eq(discipulatorResponsibles.id, input.responsibleId), eq(discipulatorResponsibles.active, "yes"))).limit(1); if (!responsible) throw new TRPCError({ code: "BAD_REQUEST", message: "Discipulador responsável não autorizado." }); } const { id, ...data } = input; await db.update(discipulators).set(data).where(eq(discipulators.id, id)); return { success: true }; }),
    importWorkbook: adminProcedure.input(z.object({ fileBase64: z.string().min(20) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); try { return await importDiscipulatorsWorkbook(db, Buffer.from(input.fileBase64, "base64")); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Não foi possível importar a planilha." }); } }),
    uploadPhoto: adminProcedure.input(profilePhotoInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [discipulator] = await db.select({ id: discipulators.id }).from(discipulators).where(eq(discipulators.id, input.id)).limit(1); if (!discipulator) throw new TRPCError({ code: "NOT_FOUND", message: "Discipulador não encontrado." }); const uploaded = await saveProfilePhoto(input.id, input.dataBase64, input.contentType, "discipulator"); await db.update(discipulators).set({ photoUrl: uploaded.url }).where(eq(discipulators.id, input.id)); return uploaded; }),
  }),
  attendance: router({
    list: linkedProcedure.input(z.object({ eventDate: z.string(), eventType: z.enum(WORSHIP_EVENT_TYPES) })).query(({ input, ctx }) => listAttendance(input.eventDate, input.eventType).then(async rows => { if (ctx.user.role !== "discipulator" || !ctx.user.discipulatorId) return rows; const db = await getDb(); if (!db) return []; const allowed = await db.select({ id: youths.id }).from(youths).where(eq(youths.discipulatorId, ctx.user.discipulatorId)); const ids = new Set(allowed.map(row => row.id)); return rows.filter(row => ids.has(row.youthId)); })),
    summary: linkedProcedure.input(z.object({ eventDate: z.string(), eventType: z.enum(WORSHIP_EVENT_TYPES) })).query(({ input, ctx }) => getAttendanceSummary(input.eventDate, input.eventType, ctx.user.role === "discipulator" ? ctx.user.discipulatorId ?? undefined : undefined)),
    markAbsence: adminProcedure.input(z.object({ eventDate: z.string(), eventType: z.enum(WORSHIP_EVENT_TYPES), youthId: z.number(), absent: z.boolean() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const eventDate = calendarDate(input.eventDate);
      let [event] = await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, sql`${eventDate}`), eq(worshipEvents.eventType, input.eventType))).limit(1);
      if (!event) { await db.insert(worshipEvents).values({ eventDate: sql`${eventDate}`, eventType: input.eventType }).onDuplicateKeyUpdate({ set: { eventType: input.eventType } }); [event] = await db.select().from(worshipEvents).where(and(eq(worshipEvents.eventDate, sql`${eventDate}`), eq(worshipEvents.eventType, input.eventType))).limit(1); }
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
      if (!attendanceId) { const [created] = await db.insert(attendance).values({ eventId: event.id, youthId: input.youthId, status: input.absent ? "absent" : "present" }); attendanceId = created.insertId; }
      if (!input.absent) return { success: true, notification: "presença registrada", notificationId: null, youthName: youth.name };
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
