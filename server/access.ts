export type AccessUser = { role: "admin" | "discipulator" | "user"; discipulatorId?: number | null };

export function canAccessScopedData(user: AccessUser) {
  return user.role === "admin" || (user.role === "discipulator" && Boolean(user.discipulatorId));
}

export function isAdmin(user: AccessUser) {
  return user.role === "admin";
}
