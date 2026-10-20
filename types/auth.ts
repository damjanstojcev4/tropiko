import type { ProfileRow, ApplicationRole } from "./database";
export type AdminUser = ProfileRow;
export type UserRole = ApplicationRole;
export interface LoginCredentials { email: string; password: string; }
export interface SignupCredentials extends LoginCredentials { name: string; }
export interface UsersPage {
  itemsReceived: number; curPage: number; nextPage: number | null; prevPage: number | null;
  offset: number; perPage: number; items: AdminUser[]; total: number;
}
