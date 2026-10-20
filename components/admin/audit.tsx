"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/api/client";
import { isSuperAdmin } from "@/lib/auth";
import type { AuditRow } from "@/types/database";
import { AdminShell } from "./admin-shell";
import { AdminErrorState, AdminLoadingState, useAdminSession } from "./admin-session";

export function AdminAudit() {
  const { user } = useAdminSession();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const allowed = isSuperAdmin(user?.role);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void createSupabaseBrowserClient().from("audit_logs").select("id,created_at,actor_id,action,target_user_id,product_id,details").order("created_at", { ascending: false }).order("id").range(page * 50, page * 50 + 50).abortSignal(controller.signal).then(({ data, error }) => {
      if (controller.signal.aborted) return;
      if (error) setError(errorMessage(error));
      else { setRows(data.slice(0, 50)); setMore(data.length > 50); }
      setLoading(false);
    });
    return () => controller.abort();
  }, [allowed, page, revision]);
  return <AdminShell><main className="admin-content"><div className="admin-title-row"><div><h1>Дневник на промени</h1><p>Евиденција од серверот за административните промени.</p></div></div>{!allowed ? <AdminErrorState message="Само супер администратор има пристап до дневникот."/> : error ? <AdminErrorState message={error} retry={() => setRevision(value => value + 1)}/> : loading ? <AdminLoadingState/> : <section className="panel"><ul className="users-list">{rows.map(row => <li className="user-card" key={row.id}><div className="user-identity"><strong>{row.action}</strong><span>{new Date(row.created_at).toLocaleString("mk-MK")}</span><span>Корисник: {row.actor_id || "Систем"}</span>{row.product_id && <span>Производ: {row.product_id}</span>}{row.target_user_id && <span>Профил: {row.target_user_id}</span>}</div></li>)}</ul>{!rows.length && <p className="admin-empty-state">Нема евидентирани промени.</p>}<nav className="users-pagination" aria-label="Страници со промени"><button className="admin-button secondary" disabled={!page} onClick={() => setPage(value => value - 1)}>Претходна</button><span>Страница {page + 1}</span><button className="admin-button secondary" disabled={!more} onClick={() => setPage(value => value + 1)}>Следна</button></nav></section>}</main></AdminShell>;
}
