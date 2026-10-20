"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { authApi } from "@/lib/api/auth";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import { AdminErrorState, useAdminSession } from "./admin-session";
import { AdminShell } from "./admin-shell";

function RecoveryCard({ title, children }: { title: string; children: ReactNode }) {
  return <main className="login-page"><section className="login-card"><Link className="admin-logo" href="/"><BrandLogo/><small>ПАНЕЛ ЗА ПРОДАВНИЦАТА</small></Link><h1 className="recovery-title">{title}</h1>{children}<p><Link className="text-link" href="/admin/login">Назад кон најава</Link></p></section></main>;
}
function PendingButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button type="submit" className="admin-button" disabled={busy}>{busy ? <><LoaderCircle className="loading-spinner" size={15}/>Се обработува...</> : children}</button>;
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await authApi.requestPasswordReset(email.trim()); setSent(true); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <RecoveryCard title="Заборавена лозинка">{sent ? <div className="admin-success-state" role="status">Ако постои профил со оваа е-пошта, ќе добиете врска за нова лозинка. Проверете ја и папката за несакана пошта.</div> : <form onSubmit={submit}><p>Внесете ја е-поштата на вашиот профил за да добиете врска за нова лозинка.</p><div className="form-field"><label htmlFor="reset-email">Е-пошта</label><input id="reset-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></div><PendingButton busy={busy}>Испрати врска</PendingButton></form>}{error && <AdminErrorState message={error}/>}</RecoveryCard>;
}

function PasswordFields({ busy, password, confirmation, setPassword, setConfirmation }: { busy: boolean; password: string; confirmation: string; setPassword: (value: string) => void; setConfirmation: (value: string) => void }) {
  return <><div className="form-field"><label htmlFor="new-password">Нова лозинка</label><input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><small>Најмалку 8 знаци.</small></div><div className="form-field"><label htmlFor="confirm-password">Потврдете ја новата лозинка</label><input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy}/></div></>;
}
function passwordError(password: string, confirmation: string) {
  if (password.length < 8) return "Лозинката мора да содржи најмалку 8 знаци.";
  if (password !== confirmation) return "Лозинките не се совпаѓаат.";
  return "";
}

export function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    void authApi.session().then(session => { if (active) setToken(session?.access_token || null); }).catch(cause => { if (active) setError(errorMessage(cause)); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!token || inFlight.current) return;
    const validation = passwordError(password, confirmation);
    if (validation) { setError(validation); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      await authApi.updatePassword(password, confirmation);
      setPassword(""); setConfirmation(""); setComplete(true);
      try { await authApi.logout(); setToken(null); }
      catch { setError("Лозинката е променета, но одјавувањето не успеа. Одјавете се од профилот кога врската ќе биде достапна."); }
    }
    catch (cause) { setError(errorMessage(cause)); if (isAuthorizationError(cause)) { setToken(null); setInvalid(true); } }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <RecoveryCard title="Нова лозинка">{!ready ? <p role="status">Се вчитува...</p> : complete ? <div className="admin-success-state" role="status">Лозинката е променета. Најавете се со новата лозинка.</div> : token && !invalid ? <form onSubmit={save}><PasswordFields busy={busy} password={password} confirmation={confirmation} setPassword={setPassword} setConfirmation={setConfirmation}/><PendingButton busy={busy}>Зачувај лозинка</PendingButton></form> : <p>Отворете ја врската од е-поштата или најавете се за да ја промените лозинката. <Link className="text-link" href="/admin/forgot-password">Побарајте нова врска</Link>.</p>}{error && <AdminErrorState message={error}/>}</RecoveryCard>;
}

export function ChangePassword() {
  const session = useAdminSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session.token || inFlight.current) return;
    const validation = passwordError(password, confirmation);
    if (validation) { setError(validation); return; }
    inFlight.current = true; setBusy(true); setError("");
    try { await authApi.updatePassword(password, confirmation, session.token); setPassword(""); setConfirmation(""); session.logout(); }
    catch (cause) { if (isAuthorizationError(cause)) session.logout(); else setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <AdminShell><main className="admin-content"><div className="admin-breadcrumb">Администрација / Мој профил</div><div className="admin-title-row"><div><h1>Моја лозинка</h1><p>Променете ја лозинката за вашиот профил. По зачувувањето, најавете се повторно.</p></div></div><form className="admin-form password-form" onSubmit={submit}><PasswordFields busy={busy} password={password} confirmation={confirmation} setPassword={setPassword} setConfirmation={setConfirmation}/>{error && <AdminErrorState message={error}/>}<PendingButton busy={busy}>Промени лозинка</PendingButton></form></main></AdminShell>;
}
