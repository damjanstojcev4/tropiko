import { apiRequest, ApiError } from "./client";
import type { AdminUser, UserRole, UsersPage } from "@/types/auth";

export interface UsersQuery { page?: number; per_page?: number; role?: UserRole; search?: string; }
export const usersApi = {
  list: async (token: string, params: UsersQuery = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: String(params.per_page ?? 20) });
    if (params.role) query.set("role", params.role);
    if (params.search?.trim()) query.set("search", params.search.trim());
    const response = await apiRequest<UsersPage | AdminUser[]>(`/admin/users?${query}`, { group: "auth", token, signal });
    // The live endpoint currently returns a raw array. Keep it usable without
    // inventing pagination links or assuming more records were returned.
    if (Array.isArray(response)) {
      return { itemsReceived: response.length, curPage: params.page ?? 1, nextPage: null, prevPage: null, offset: 0, perPage: response.length, items: response, responseFormat: "array" as const };
    }
    if (!Array.isArray(response.items)) throw new ApiError("Серверот не врати валидна листа на корисници.", 0);
    return { ...response, responseFormat: "paginated" as const };
  },
  updateRole: async (id: number, role: UserRole, token: string) => {
    const response = await apiRequest<{ success: boolean; user: AdminUser }>(`/admin/users/${id}/role`, { group: "auth", token, method: "PATCH", body: JSON.stringify({ role }) });
    if (!response.success || response.user?.id !== id || response.user.role !== role) throw new ApiError("Улогата не е потврдена. Освежете ја листата пред повторен обид.", 0);
    return response.user;
  },
};
