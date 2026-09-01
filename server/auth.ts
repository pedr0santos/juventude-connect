import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { authSessions, passwordResetTokens, users, type User } from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword, normalizeEmail, validatePassword, verifyPassword } from "./passwords";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export { normalizeEmail, hashPassword, validatePassword, verifyPassword } from "./passwords";

export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, openId: _openId, ...publicUser } = user;
  return publicUser;
}

function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  const token = randomBytes(32).toString("base64url");
  await db.insert(authSessions).values({
    userId,
    tokenHash: digestToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function getUserBySessionToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const result = await db
    .select({ user: users, sessionId: authSessions.id })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(
      eq(authSessions.tokenHash, digestToken(token)),
      isNull(authSessions.revokedAt),
      gt(authSessions.expiresAt, now),
    ))
    .limit(1);

  const session = result[0];
  if (!session || session.user.accountStatus !== "active") return null;

  await db.update(authSessions).set({ lastUsedAt: now }).where(eq(authSessions.id, session.sessionId));
  await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, session.user.id));
  return session.user;
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, digestToken(token)));
}

export async function revokeUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}

export async function createPasswordResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: digestToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.tokenHash, digestToken(token)),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ))
    .limit(1);
  const reset = result[0];
  if (!reset) return null;

  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, reset.id));
  return reset.userId;
}

export const AUTH_SESSION_TTL_MS = SESSION_TTL_MS;
