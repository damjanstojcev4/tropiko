export interface AdminUser { id: number; created_at?: number; name: string; email: string; role: string; }
export interface LoginResponse { authToken: string; user_id: number; }
export interface LoginCredentials { email: string; password: string; }
export type UserRole = "member" | "admin" | "super_admin";
export interface SignupCredentials extends LoginCredentials { name: string; }
export interface UsersPage {
  itemsReceived: number; curPage: number; nextPage: number | null; prevPage: number | null;
  offset: number; perPage: number; items: AdminUser[];
  responseFormat?: "paginated" | "array";
}
