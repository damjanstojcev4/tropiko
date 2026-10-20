"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import { canManageProducts } from "@/lib/auth";
import type { AdminUser, LoginCredentials } from "@/types/auth";

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
  const verification = useRef(0), loggingIn = useRef(false);
  const clear = useCallback(() => { verification.current++; setUser(null); setToken(null); setStatus("unauthenticated"); }, []);
  const logout = useCallback(() => {
    void authApi.logout().then(() => { clear(); setError(""); router.replace("/admin/login"); }).catch(cause => { setError(errorMessage(cause)); setStatus("error"); });
  }, [clear, router]);
  const verify = useCallback(async (signal?: AbortSignal, silent = false) => {
    const request = ++verification.current;
    if (!silent) setStatus("loading");
    setError("");
    try {
      const saved = await authApi.session();
      if (request !== verification.current || signal?.aborted) return;
      if (!saved) { clear(); return; }
      const current = await authApi.me(undefined, signal);
      if (request !== verification.current || signal?.aborted) return;
      if (!canManageProducts(current.role)) { clear(); setError("Овој профил нема администраторски пристап."); return; }
      setUser(current); setToken(saved.access_token); setStatus("authenticated");
    } catch (cause) {
      if (request !== verification.current || signal?.aborted) return;
      setError(errorMessage(cause));
      if (isAuthorizationError(cause)) clear(); else setStatus("error");
    }
  }, [clear]);
  useEffect(() => {
    const controller = new AbortController();
    try { window.sessionStorage.removeItem("banana-makovo-admin-token"); } catch { /* Discard obsolete Xano session only. */ }
    void verify(controller.signal);
    let unsubscribe = () => {};
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const { data } = createSupabaseBrowserClient().auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") { clear(); return; }
        if (loggingIn.current || event === "INITIAL_SESSION") return;
        if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
          // Never await another Auth call inside the Auth event callback.
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => { if (!loggingIn.current) void verify(controller.signal, true); }, 0);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch { /* verify displays configuration errors. */ }
    const onFocus = () => { if (!loggingIn.current) void verify(controller.signal, true); };
    window.addEventListener("focus", onFocus);
    return () => { controller.abort(); clearTimeout(refreshTimer); unsubscribe(); window.removeEventListener("focus", onFocus); };
  }, [verify, clear]);
  const login = useCallback(async (credentials: LoginCredentials) => {
    const request = ++verification.current;
    loggingIn.current = true; setError("");
    try {
      const saved = await authApi.login(credentials);
      const current = await authApi.me();
      if (request !== verification.current) throw new Error("Сесијата е променета. Најавете се повторно.");
      if (!canManageProducts(current.role)) { clear(); throw new Error("Овој профил нема администраторски пристап."); }
      setUser(current); setToken(saved.access_token); setStatus("authenticated");
    } finally { loggingIn.current = false; }
  }, [clear]);
  const value = useMemo(() => ({ user, token, status, error, login, logout, retry: () => { void verify(); }, refresh: () => verify() }), [user, token, status, error, login, logout, verify]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAdminSession(): AdminSession {
  const context = useContext(Context);
  if (!context) throw new Error("AdminSessionProvider is required.");
  return context;
}
export function AdminLoadingState({ message = "Се вчитува..." }: { message?: string }) { return <div className="admin-loading-state" role="status"><LoaderCircle className="loading-spinner" size={22}/><span>{message}</span></div>; }
export function AdminErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="admin-error-state" role="alert"><p>{message}</p>{retry && <button className="admin-button secondary" type="button" onClick={retry}>Обиди се повторно</button>}</div>; }
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const session = useAdminSession(), router = useRouter(), path = usePathname();
  useEffect(() => { if (session.status === "unauthenticated") router.replace(`/admin/login?next=${encodeURIComponent(path)}`); }, [session.status, path, router]);
  if (session.status === "error") return <main className="admin-session-state"><AdminErrorState message={session.error} retry={session.retry}/><button className="admin-button secondary" onClick={session.logout}>Одјави се</button></main>;
  if (session.status !== "authenticated") return <main className="admin-session-state"><AdminLoadingState message="Се проверува вашата сесија..."/></main>;
  return children;
}
