import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, encodedKey] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !encodedKey) return false;

  const expectedKey = Buffer.from(encodedKey, "hex");
  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer;
  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
}

export function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 128;
}
