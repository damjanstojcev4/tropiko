"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Mail, Plus, Search } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { authApi } from "@/lib/api/auth";
import { ApiError, errorMessage } from "@/lib/api/client";
import { isSuperAdmin, isUserRole, roleLabels } from "@/lib/auth";
import type { AdminUser, UserRole, UsersPage } from "@/types/auth";
import { AdminErrorState, AdminLoadingState, useAdminSession } from "./admin-session";
import { AdminShell } from "./admin-shell";
import { AccountRegistration } from "./account-registration";

function RoleEditor({ user, disabled, onSave }: { user: AdminUser; disabled: boolean; onSave: (user: AdminUser, role: UserRole) => Promise<void> }) {
  const [role, setRole] = useState(user.role);
  return <form className="user-role-editor" onSubmit={event => { event.preventDefault(); if (isUserRole(role)) void onSave(user, role); }}><label className="sr-only" htmlFor={`role-${user.id}`}>Улога за {user.email}</label><select id={`role-${user.id}`} value={role} onChange={event => setRole(event.target.value)} disabled={disabled}>{!isUserRole(user.role) && <option value={user.role}>{user.role}</option>}{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="admin-button secondary" disabled={disabled || user.role === role} type="submit">Зачувај</button></form>;
}

export function AdminUsers() {
  const session = useAdminSession();
  const superAdmin = isSuperAdmin(session.user?.role);
  const [data, setData] = useState<UsersPage | null>(null);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<UserRole | "">("");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const inFlight = useRef(false);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const { token, status, logout } = session;

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    usersApi.list(token, { page, per_page: 20, role: role || undefined, search }, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (result.items.length === 0 && page > 1) { setPage(result.prevPage ?? 1); return; }
      setData(result);
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setError(errorMessage(cause));
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) logout();
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, status, page, role, search, revision, logout]);
  useEffect(() => { window.addEventListener("focus", reload); return () => window.removeEventListener("focus", reload); }, [reload]);

  async function updateRole(user: AdminUser, next: UserRole) {
    if (!token || !superAdmin || inFlight.current || showCreate) return;
    const self = session.user?.id === user.id;
    const warning = self && next !== "super_admin" ? " Ќе го изгубите супер администраторскиот пристап." : next === "super_admin" ? " Овој профил ќе може да ги менува улогите на корисниците." : "";
    if (!window.confirm(`Да ја промените улогата за ${user.email} во „${roleLabels[next]}“?${warning}`)) return;
    inFlight.current = true; setPending(user.id); setNotice(""); setWriteError("");
    try {
      const updated = await usersApi.updateRole(user.id, next, token);
      setData(current => current ? { ...current, items: current.items.map(item => item.id === user.id ? updated : item) } : current);
      setNotice(`Улогата за ${user.email} е зачувана.`); reload();
      if (self) await session.refresh();
    } catch (cause) {
      setWriteError(errorMessage(cause));
      if (cause instanceof ApiError && cause.status === 401) logout();
      else if (cause instanceof ApiError && cause.status === 403) await session.refresh();
    } finally { inFlight.current = false; setPending(null); }
  }
  async function sendReset(user: AdminUser) {
    if (!superAdmin || inFlight.current || showCreate) return;
    if (!window.confirm(`Да испратите врска за нова лозинка на ${user.email}? Корисникот сам ќе ја постави новата лозинка.`)) return;
    inFlight.current = true; setPending(user.id); setNotice(""); setWriteError("");
    try { await authApi.requestPasswordReset(user.email); setNotice(`Побарана е врска за нова лозинка за ${user.email}. Проверете ја е-поштата.`); }
    catch (cause) { setWriteError(errorMessage(cause)); }
    finally { inFlight.current = false; setPending(null); }
  }
  function filter(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(input.trim()); }
  return <AdminShell><main className="admin-content">
    <div className="admin-breadcrumb">Администрација / Корисници</div>
    <div className="admin-title-row users-title"><div><h1>Корисници</h1><p>{superAdmin ? "Создавајте профили, доделувајте улоги и помогнете со обновување на лозинки." : "Преглед на корисниците и нивните улоги."}</p></div>{superAdmin && <button className="admin-button" disabled={pending !== null || createBusy} onClick={() => setShowCreate(value => !value)}><Plus/>{showCreate ? "Затвори форма" : "Нов корисник"}</button>}</div>
    {notice && <div className="admin-success-state" role="status">{notice}</div>}
    {writeError && <AdminErrorState message={writeError}/>}
    {showCreate && superAdmin && <section className="create-user-section"><h2>Нов корисник</h2><AccountRegistration admin onBusyChange={setCreateBusy} onCreated={message => { setNotice(message); setShowCreate(false); reload(); }}/></section>}
    {!superAdmin && <p className="user-access-note">Само супер администратор може да создава администраторски профили и да ги менува улогите.</p>}
    {data?.responseFormat === "array" && !loading && !error && <p className="user-access-note">Серверот не потврдува дали ова е целосната листа. Ако недостасува профил, проверете го во Xano пред да создадете нов.</p>}
    <section className="panel" aria-label="Корисници">
      <form className="toolbar" onSubmit={filter}><label className="admin-search"><Search size={15}/><span className="sr-only">Пребарај корисници</span><input value={input} onChange={event => setInput(event.target.value)} placeholder="Име или е-пошта..."/></label><button className="admin-button secondary" type="submit">Пребарај</button><select className="admin-select" aria-label="Филтрирај по улога" value={role} onChange={event => { setRole(event.target.value as UserRole | ""); setPage(1); }}><option value="">Сите улоги</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></form>
      {error ? <AdminErrorState message={error} retry={reload}/> : loading ? <AdminLoadingState message="Се вчитуваат корисниците..."/> : <>
        <ul className="users-list">{data?.items.map(user => <li className="user-card" key={user.id} aria-busy={pending === user.id}>
          <div className="user-identity">
            <strong>{user.name}{session.user?.id === user.id ? " (вие)" : ""}</strong><span>{user.email}</span>
            <span className={`user-role-badge ${user.role === "super_admin" ? "super" : ""}`}>{isUserRole(user.role) ? roleLabels[user.role] : user.role}</span>
          </div>
          {superAdmin && <div className="user-controls">
            <RoleEditor key={`${user.id}:${user.role}`} user={user} disabled={pending !== null || showCreate} onSave={updateRole}/>
            <button className="admin-button secondary" type="button" disabled={pending !== null || showCreate} onClick={() => { void sendReset(user); }}><Mail/>Врска за лозинка</button>
          </div>}
        </li>)}</ul>
        {data?.items.length === 0 && <div className="admin-empty-state">Нема корисници што одговараат на избраните филтри.</div>}
        <nav className="users-pagination" aria-label="Страници со корисници">
          <button className="admin-button secondary" disabled={data?.prevPage == null || pending !== null} onClick={() => { if (data?.prevPage) setPage(data.prevPage); }}><ChevronLeft/>Претходна</button>
          <span>Страница {data?.curPage ?? page}</span>
          <button className="admin-button secondary" disabled={data?.nextPage == null || pending !== null} onClick={() => { if (data?.nextPage) setPage(data.nextPage); }}>Следна<ChevronRight/></button>
        </nav>
      </>}
    </section>
  </main></AdminShell>;
}
