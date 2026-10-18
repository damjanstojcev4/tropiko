import type { UserRole } from "@/types/auth";

export const roleLabels: Record<UserRole, string> = {
  member: "Член", admin: "Администратор", super_admin: "Супер администратор",
};
export function isUserRole(role: string): role is UserRole { return role === "member" || role === "admin" || role === "super_admin"; }
export function canManageProducts(role?: string): boolean { return role === "admin" || role === "super_admin"; }
export function isSuperAdmin(role?: string): boolean { return role === "super_admin"; }
export function signupPasswordError(password: string): string {
  if (password.length < 8 || !/\p{L}/u.test(password) || !/[0-9]/.test(password)) return "Лозинката мора да содржи најмалку 8 знаци, една буква и една цифра.";
  return "";
}
