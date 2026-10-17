import { apiRequest } from "./client";
// Authentication request and session storage remain pending the Xano contract.
export const authApi = {
  login: (credentials: { email: string; password: string }) => apiRequest<unknown>("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
};
