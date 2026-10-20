import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ApiError, databaseError } from "./client";
import type { AdminUser, SignupCredentials, UserRole, UsersPage } from "@/types/auth";

export interface UsersQuery { page?: number; per_page?: number; role?: UserRole; search?: string; }
export class AccountCreationError extends ApiError {
  constructor(message: string, status: number, public createdUserId?: string) { super(message, status); }
}
async function invokeAdmin<T>(name: string, body: object): Promise<T> {
  const { data, error } = await createSupabaseBrowserClient().functions.invoke<T>(name, { body });
  if (error) {
    const context = "context" in error && error.context instanceof Response ? error.context : null;
    const response = context ? await context.clone().json().catch(() => null) as { error?: string; message?: string; created_user_id?: string } | null : null;
    const status = context?.status || 503;
    const message = status === 404 || !context ? "Услугата за управување со профили не е достапна. Потребно е објавување на Supabase Edge Functions." : response?.error || response?.message || error.message;
    if (name === "admin-create-user") throw new AccountCreationError(message, status, response?.created_user_id);
    throw new ApiError(message, status);
  }
  if (!data) throw new ApiError("Серверот не ја потврди промената.", 500);
  return data;
}
export const usersApi = {
  list: async (_token: string, params: UsersQuery = {}, signal?: AbortSignal): Promise<UsersPage> => {
    const page = Math.max(1, params.page ?? 1), perPage = Math.min(100, Math.max(1, params.per_page ?? 20));
    const offset = (page - 1) * perPage;
    let query = createSupabaseBrowserClient().from("profiles").select("id,name,email,role,created_at,updated_at", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(offset, offset + perPage - 1);
    if (params.role) query = query.eq("role", params.role);
    if (params.search?.trim()) {
      // Quote the PostgREST pattern so commas/parentheses cannot alter its filter grammar.
      const pattern = `%${params.search.trim().replace(/[\\%_]/g, "\\$&").replace(/"/g, '\\"')}%`;
      query = query.or(`name.ilike."${pattern}",email.ilike."${pattern}"`);
    }
    if (signal) query = query.abortSignal(signal);
    const { data, error, count } = await query;
    if (error) throw databaseError(error);
    const total = count ?? 0;
    return { items: data, itemsReceived: data.length, curPage: page, nextPage: offset + perPage < total ? page + 1 : null, prevPage: page > 1 ? page - 1 : null, offset, perPage, total };
  },
  updateRole: async (id: string, role: UserRole, _token: string) => {
    void _token;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("set_user_role", { p_user_id: id, p_role: role });
    if (error) throw databaseError(error);
    const { data, error: readError } = await supabase.from("profiles").select().eq("id", id).single();
    if (readError) throw databaseError(readError);
    if (data.role !== role) throw new ApiError("Улогата не е потврдена. Освежете ја листата.", 500);
    return data;
  },
  create: (credentials: SignupCredentials & { role: UserRole }) => invokeAdmin<AdminUser>("admin-create-user", credentials),
  resetPassword: (userId: string, newPassword: string) => invokeAdmin<{ ok: true }>("admin-reset-user-password", { userId, newPassword }),
};
