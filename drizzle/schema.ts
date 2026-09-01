import { date, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  accountStatus: mysqlEnum("accountStatus", ["pending", "active", "suspended"]).default("pending").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "discipulator"]).default("user").notNull(),
  discipulatorId: int("discipulatorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const authSessions = mysqlTable("auth_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userIdx: index("auth_sessions_user_idx").on(table.userId), expiryIdx: index("auth_sessions_expiry_idx").on(table.expiresAt) }));

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userIdx: index("password_reset_user_idx").on(table.userId), expiryIdx: index("password_reset_expiry_idx").on(table.expiresAt) }));

export const discipulators = mysqlTable("discipulators", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ nameIdx: index("discipulators_name_idx").on(table.name) }));

export const youths = mysqlTable("youths", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  birthDate: date("birthDate").notNull(),
  whatsapp: varchar("whatsapp", { length: 32 }).notNull(),
  address: varchar("address", { length: 255 }),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  discipulatorId: int("discipulatorId"),
  discipleshipStartDate: date("discipleshipStartDate").notNull(),
  relationshipStatus: mysqlEnum("relationshipStatus", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ birthdayIdx: index("youths_birth_date_idx").on(table.birthDate), discipulatorIdx: index("youths_discipulator_idx").on(table.discipulatorId) }));

export const discipleshipHistory = mysqlTable("discipleship_history", {
  id: int("id").autoincrement().primaryKey(),
  youthId: int("youthId").notNull(),
  discipulatorId: int("discipulatorId").notNull(),
  startedAt: date("startedAt").notNull(),
  endedAt: date("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ youthIdx: index("history_youth_idx").on(table.youthId) }));

export const worshipEvents = mysqlTable("worship_events", {
  id: int("id").autoincrement().primaryKey(),
  eventDate: date("eventDate").notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ dateTypeUnique: uniqueIndex("worship_event_date_type_unique").on(table.eventDate, table.eventType) }));

export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  youthId: int("youthId").notNull(),
  status: mysqlEnum("status", ["present", "absent"]).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  correctedAt: timestamp("correctedAt"),
}, table => ({ eventYouthUnique: uniqueIndex("attendance_event_youth_unique").on(table.eventId, table.youthId), youthIdx: index("attendance_youth_idx").on(table.youthId) }));

export const followUps = mysqlTable("follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull().unique(),
  youthId: int("youthId").notNull(),
  discipulatorId: int("discipulatorId").notNull(),
  status: mysqlEnum("status", ["pending", "contacted", "talked", "justification", "resolved"]).default("pending").notNull(),
  notes: text("notes"),
  lastContactAt: timestamp("lastContactAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ statusIdx: index("follow_up_status_idx").on(table.status), youthIdx: index("follow_up_youth_idx").on(table.youthId) }));

export const messageLogs = mysqlTable("message_logs", {
  id: int("id").autoincrement().primaryKey(),
  youthId: int("youthId"),
  discipulatorId: int("discipulatorId"),
  messageType: mysqlEnum("messageType", ["birthday", "absence"]).notNull(),
  referenceKey: varchar("referenceKey", { length: 180 }).notNull(),
  recipient: varchar("recipient", { length: 32 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "test"]).default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  error: text("error"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ dedupeUnique: uniqueIndex("message_reference_unique").on(table.messageType, table.referenceKey), createdIdx: index("messages_created_idx").on(table.createdAt) }));

export const absenceNotifications = mysqlTable("absence_notifications", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull().unique(),
  youthId: int("youthId").notNull(),
  discipulatorId: int("discipulatorId"),
  recipient: varchar("recipient", { length: 32 }),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["pending", "sending", "sent", "error", "cancelled"]).default("pending").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
}, table => ({ attendanceIdx: index("absence_notifications_attendance_idx").on(table.attendanceId), statusIdx: index("absence_notifications_status_idx").on(table.status), createdIdx: index("absence_notifications_created_idx").on(table.createdAt) }));

export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  birthdayTemplate: text("birthdayTemplate").notNull(),
  absenceTemplate: text("absenceTemplate").notNull(),
  whatsappPhoneNumberId: varchar("whatsappPhoneNumberId", { length: 120 }),
  whatsappBusinessAccountId: varchar("whatsappBusinessAccountId", { length: 120 }),
  whatsappToken: text("whatsappToken"),
  whatsappEnabled: mysqlEnum("whatsappEnabled", ["enabled", "disabled"]).default("disabled").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Youth = typeof youths.$inferSelect;
export type Discipulator = typeof discipulators.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type FollowUp = typeof followUps.$inferSelect;
export type MessageLog = typeof messageLogs.$inferSelect;
export type AbsenceNotification = typeof absenceNotifications.$inferSelect;

export type InsertUser = typeof users.$inferInsert;
