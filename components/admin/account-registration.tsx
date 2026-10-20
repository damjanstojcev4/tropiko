"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { AccountCreationError, usersApi } from "@/lib/api/users";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import { isSuperAdmin, roleLabels, signupPasswordError } from "@/lib/auth";
import type { UserRole } from "@/types/auth";
import { BrandLogo } from "@/components/brand-logo";
import { AdminErrorState, useAdminSession } from "./admin-session";

export function AccountRegistration({ admin = false, onCreated, onBusyChange }: { admin?: boolean; onCreated?: (message: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const session = useAdminSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<UserRole>("admin");
  const [created, setCreated] = useState<{ id: string; name: string; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current || (admin && (!session.token || !isSuperAdmin(session.user?.role)))) return;
    if (!created) {
      const validation = !name.trim() ? "Внесете име." : signupPasswordError(password) || (password !== confirmation ? "Лозинките не се совпаѓаат." : "");
      if (validation) { setError(validation); return; }
    }
    if (admin && role === "super_admin" && !window.confirm(`Да му дадете супер администраторски пристап на ${email.trim()}? Овој профил ќе може да ги менува улогите на корисниците.`)) return;
    inFlight.current = true; setBusy(true); onBusyChange?.(true); setError("");
    let account = created;
    try {
      if (!account) {
        const credentials = { name: name.trim(), email: email.trim(), password };
        const response = admin ? await usersApi.create({ ...credentials, role }) : await authApi.signup(credentials);
        account = { id: "user_id" in response ? response.user_id : response.id, name: name.trim(), email: email.trim() };
        setCreated(account); setPassword(""); setConfirmation("");
      } else if (admin) await usersApi.updateRole(account.id, role, session.token!);
      setComplete(true);
      onCreated?.(`Профилот за ${account.email} е создаден со улога „${roleLabels[admin ? role : "member"]}“.`);
    } catch (cause) {
      if (cause instanceof AccountCreationError && cause.createdUserId) {
        account = { id: cause.createdUserId, name: name.trim(), email: email.trim() };
        setCreated(account); setPassword(""); setConfirmation("");
      }
      const detail = errorMessage(cause);
      setError(account ? `Профилот за ${account.email} веќе е создаден, но операцијата не е целосно потврдена. Проверете го во листата или обидете се повторно да ја зачувате улогата. ${detail}` : detail);
      if (admin && isAuthorizationError(cause)) void session.refresh();
    } finally { inFlight.current = false; setBusy(false); onBusyChange?.(false); }
  }

  if (admin && !isSuperAdmin(session.user?.role)) return null;
  if (complete) return <div className="admin-success-state" role="status">{admin ? "Профилот е создаден." : <>Проверете ја е-поштата за потврда на профилот. За пристап до администрацијата, супер администратор треба да ви додели соодветна улога. <Link className="text-link" href="/admin/login">Кон најава</Link></>}</div>;
  return <form className={admin ? "admin-form account-form" : undefined} onSubmit={submit}>
    <p>{admin ? "Новиот профил прво се создава како член, а потоа ја добива избраната улога." : "Регистрацијата создава профил со улога член. Администраторски пристап доделува супер администратор."}</p>
    <fieldset disabled={busy} className="product-form-fields">
      <div className="form-field"><label htmlFor="account-name">Име и презиме</label><input id="account-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required disabled={Boolean(created)}/></div>
      <div className="form-field"><label htmlFor="account-email">Е-пошта</label><input id="account-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required disabled={Boolean(created)}/></div>
      {!created && <><div className="form-field"><label htmlFor="account-password">Лозинка</label><input id="account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required/><small>Најмалку 8 знаци, една буква и една цифра.</small></div><div className="form-field"><label htmlFor="account-confirmation">Потврди лозинка</label><input id="account-confirmation" type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required/></div></>}
      {admin && <div className="form-field"><label htmlFor="account-role">Улога</label><select id="account-role" value={role} onChange={event => setRole(event.target.value as UserRole)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
      {created && <p className="form-feedback">Профилот веќе постои. Следниот обид ја зачувува само улогата.</p>}
      <button className="admin-button" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="loading-spinner" size={15}/>Се зачувува...</> : created ? "Зачувај улога" : "Создај профил"}</button>
    </fieldset>
    {error && <AdminErrorState message={error}/>}
  </form>;
}

export function RegisterPage() {
  return <main className="login-page"><section className="login-card"><Link href="/" className="admin-logo"><BrandLogo/><small>ПАНЕЛ ЗА ПРОДАВНИЦАТА</small></Link><h1 className="recovery-title">Нов профил</h1><AccountRegistration/><p><Link className="text-link" href="/admin/login">Назад кон најава</Link></p></section></main>;
}
