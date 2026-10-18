import { apiRequest, ApiError } from "./client";
import type { AdminUser, LoginCredentials, LoginResponse, SignupCredentials } from "@/types/auth";

const SESSION_KEY = "banana-makovo-admin-token";
type PasswordResponse = { message: { success: boolean | string; message: string } } | { success: boolean | string; message: string };
function confirmPasswordResponse(response: PasswordResponse): void {
  const result = typeof response.message === "object" ? response.message : response as { success: boolean | string; message: string };
  if (result?.success !== true && result?.success !== "true") {
    throw new ApiError(result?.message || "Барањето не успеа. Обидете се повторно.", 0);
  }
}
export function storedToken(): string | null {
  try { return window.sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
export function storeToken(token: string): void { window.sessionStorage.setItem(SESSION_KEY, token); }
export const authApi = {
  signup: async (credentials: SignupCredentials) => {
    const response = await apiRequest<LoginResponse>("/auth/signup", { group: "auth", method: "POST", body: JSON.stringify({ name: credentials.name, email: credentials.email, password: credentials.password }) });
    if (!response.authToken || !Number.isInteger(response.user_id)) throw new ApiError("Серверот не врати валиден профил. Проверете ја листата пред повторно да се регистрирате.", 0);
    // Registration never replaces the administrator's current session.
    return response;
  },
  login: async (credentials: LoginCredentials) => {
    const response = await apiRequest<LoginResponse>("/auth/login", { group: "auth", method: "POST", body: JSON.stringify(credentials) });
    if (!response.authToken) throw new ApiError("Серверот не врати валидна сесија.", 0);
    return response;
  },
  me: (token: string, signal?: AbortSignal) => apiRequest<AdminUser>("/auth/me", { group: "auth", token, signal }),
  requestPasswordReset: async (email: string) => {
    const response = await apiRequest<PasswordResponse>(`/reset/request-reset-link?${new URLSearchParams({ email })}`, { group: "auth" });
    confirmPasswordResponse(response);
  },
  exchangeMagicToken: async (magic_token: string, email: string) => {
    const response = await apiRequest<LoginResponse>("/reset/magic-link-login", { group: "auth", method: "POST", body: JSON.stringify({ magic_token, email }) });
    if (!response.authToken) throw new ApiError("Врската не врати валидна сесија. Побарајте нова врска.", 0);
    return response.authToken;
  },
  updatePassword: async (password: string, confirm_password: string, token: string) => {
    const response = await apiRequest<PasswordResponse>("/reset/update_password", { group: "auth", token, method: "POST", body: JSON.stringify({ password, confirm_password }) });
    confirmPasswordResponse(response);
  },
  // The supplied contract has no logout/revoke endpoint. Discard this browser session locally.
  logout: () => { try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* No browser session to remove. */ } },
};
