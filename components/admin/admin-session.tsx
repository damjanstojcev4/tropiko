"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authApi, storedToken, storeToken } from "@/lib/api/auth";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import type { AdminUser, LoginCredentials } from "@/types/auth";
import { canManageProducts } from "@/lib/auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated" | "error";
interface AdminSession {
  user: AdminUser | null; token: string | null; status: SessionStatus; error: string;
  login: (credentials: LoginCredentials) => Promise<void>; logout: () => void; retry: () => void; refresh: () => Promise<void>;
}
const Context = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState("");
  const verification = useRef(0);

  const logout = useCallback(() => {
    verification.current++;
    authApi.logout(); setUser(null); setToken(null); setStatus("unauthenticated"); setError("");
    router.replace("/admin/login");
  }, [router]);
  const verify = useCallback(async (signal?: AbortSignal, silent = false) => {
    const request = ++verification.current;
    const saved = storedToken();
    if (!saved) { setUser(null); setToken(null); setStatus("unauthenticated"); return; }
    if (!silent) setStatus("loading");
    setError("");
    try {
      const current = await authApi.me(saved, signal);
      if (request !== verification.current || signal?.aborted) return;
      if (!canManageProducts(current.role)) { authApi.logout(); setUser(null); setToken(null); setStatus("unauthenticated"); setError("Немате администраторски пристап."); return; }
      setUser(current); setToken(saved); setStatus("authenticated");
    } catch (cause) {
      if (request !== verification.current || signal?.aborted) return;
      setError(errorMessage(cause));
      if (isAuthorizationError(cause)) { authApi.logout(); setUser(null); setToken(null); setStatus("unauthenticated"); }
      else setStatus("error");
    }
  }, []);
  useEffect(() => { const controller = new AbortController(); void verify(controller.signal); return () => controller.abort(); }, [verify]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { if (storedToken()) void verify(controller.signal, true); };
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [verify]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const request = ++verification.current;
    authApi.logout(); setUser(null); setToken(null); setStatus("unauthenticated"); setError("");
    const response = await authApi.login(credentials);
    const current = await authApi.me(response.authToken);
    if (request !== verification.current) throw new Error("Сесијата е променета. Најавете се повторно.");
    if (!canManageProducts(current.role)) throw new Error("Овој профил нема администраторски пристап.");
    storeToken(response.authToken);
    setUser(current); setToken(response.authToken); setStatus("authenticated"); setError("");
  }, []);
  const value = useMemo(() => ({ user, token, status, error, login, logout, retry: () => { void verify(); }, refresh: () => verify() }), [user, token, status, error, login, logout, verify]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminSession(): AdminSession {
  const context = useContext(Context);
  if (!context) throw new Error("AdminSessionProvider is required.");
  return context;
}
export function AdminLoadingState({ message = "Се вчитува..." }: { message?: string }) {
  return <div className="admin-loading-state" role="status"><LoaderCircle className="loading-spinner" size={22}/><span>{message}</span></div>;
}
export function AdminErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="admin-error-state" role="alert"><p>{message}</p>{retry && <button type="button" className="admin-button secondary" onClick={retry}>Обиди се повторно</button>}</div>;
}
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = useAdminSession();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (session.status === "unauthenticated") router.replace(`/admin/login?next=${encodeURIComponent(path)}`); }, [session.status, path, router]);
  if (session.status === "error") return <main className="admin-session-state"><AdminErrorState message={session.error} retry={session.retry}/><button className="admin-button secondary" onClick={session.logout}>Кон најава</button></main>;
  if (session.status !== "authenticated") return <main className="admin-session-state"><AdminLoadingState message="Се проверува вашата сесија..."/></main>;
  return children;
}
