"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Boxes, Eye, EyeOff, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { productApi } from "@/lib/api/products";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import { categoryLabel } from "@/lib/api/mappers";
import { publishCatalogChange } from "@/lib/catalog-events";
import { useCatalog } from "@/lib/use-catalog";
import { AdminErrorState, AdminLoadingState, useAdminSession } from "./admin-session";
import { AdminImage, AdminShell, Status } from "./admin-shell";
import { ProductFormPage } from "./product-form";
import type { Product } from "@/types/product";

export function AdminDashboard() {
  const session = useAdminSession();
  const { products, loading, error, reload } = useCatalog({ enabled: session.status === "authenticated", adminToken: session.token, onUnauthorized: session.logout });
  const available = products.filter(product => product.is_available).length;
  return <AdminShell><main className="admin-content">
    <div className="admin-breadcrumb">Администрација / Преглед</div>
    <div className="admin-title-row"><div><h1>Контролна табла</h1><p>Преглед на тековната понуда во вашата продавница.</p></div><Link className="admin-button" href="/admin/products/new"><Plus/>Додај производ</Link></div>
    {error ? <AdminErrorState message={error} retry={reload}/> : loading && products.length === 0 ? <AdminLoadingState message="Се вчитува каталогот..."/> : <>
      <section className="stat-grid" aria-label="Преглед на производи">
        <div className="stat-card"><Boxes className="stat-icon"/><div className="stat-label">Производи во каталогот</div><div className="stat-value">{products.length}</div><div className="stat-hint">Тековна понуда</div></div>
        <div className="stat-card"><ArrowUpRight className="stat-icon"/><div className="stat-label">Достапни производи</div><div className="stat-value">{available}</div><div className="stat-hint">Подготвени за купувачите</div></div>
        <div className="stat-card"><ArrowDownRight className="stat-icon"/><div className="stat-label">Нема на залиха</div><div className="stat-value">{products.length - available}</div><div className="stat-hint">Видливи во каталогот</div></div>
      </section>
      <section className="panel"><div className="panel-heading"><h2>Производи во понуда</h2><Link className="text-link" href="/admin/products">Сите производи →</Link></div><div className="panel-body recent-list">{products.slice(0, 5).map(product => <div className="recent-row" key={product.id}><AdminImage src={product.imageUrl}/><div><strong>{product.name}</strong><small>{categoryLabel(product)} · {product.salePrice ?? product.price} ден/{product.unit}</small></div><Status type={product.is_available ? "good" : "out"}>{product.is_available ? "Достапно" : "Нема на залиха"}</Status>{product.salePrice && <Status type="sale">Акција</Status>}</div>)}{products.length === 0 && <div className="admin-empty-state">Нема производи. Додајте го првиот производ за да ја започнете понудата.</div>}</div></section>
    </>}
  </main></AdminShell>;
}

export function AdminProducts() {
  const session = useAdminSession();
  const { products, setProducts, loading, error, reload } = useCatalog({ enabled: session.status === "authenticated", adminToken: session.token, onUnauthorized: session.logout });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [notice, setNotice] = useState("");
  const [writeError, setWriteError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const visible = useMemo(() => products.filter(product => product.name.toLocaleLowerCase("mk").includes(query.trim().toLocaleLowerCase("mk")) && (category === "all" || product.category === category) && (availability === "all" || product.is_available === (availability === "available"))), [products, query, category, availability]);

  async function toggle(product: Product) {
    if (!session.token || mutationInFlight.current) return;
    mutationInFlight.current = true; setPending(product.id); setNotice(""); setWriteError("");
    try {
      const updated = await productApi.setAvailability(product.id, !product.is_available, session.token);
      setProducts(current => current.map(item => item.id === product.id ? updated : item));
      setNotice(`Достапноста за „${product.name}“ е зачувана.`); publishCatalogChange();
    } catch (cause) { if (isAuthorizationError(cause)) session.logout(); else setWriteError(errorMessage(cause)); }
    finally { mutationInFlight.current = false; setPending(null); }
  }
  async function remove(product: Product) {
    if (!session.token || mutationInFlight.current) return;
    if (!window.confirm(`Да го избришете „${product.name}“? Ова го отстранува производот од каталогот.`)) return;
    mutationInFlight.current = true; setPending(product.id); setNotice(""); setWriteError("");
    try {
      const result = await productApi.remove(product.id, session.token);
      if (!result.success) throw new Error("Производот не е избришан. Обидете се повторно.");
      setProducts(current => current.filter(item => item.id !== product.id));
      setNotice(`„${product.name}“ е избришан од каталогот.`); publishCatalogChange();
    } catch (cause) { if (isAuthorizationError(cause)) session.logout(); else setWriteError(errorMessage(cause)); }
    finally { mutationInFlight.current = false; setPending(null); }
  }

  return <AdminShell><main className="admin-content">
    <div className="admin-breadcrumb">Администрација / Каталог</div>
    <div className="admin-title-row"><div><h1>Производи</h1><p>Управувајте со фотографиите, цените и достапноста.</p></div><Link className="admin-button" href="/admin/products/new"><Plus/>Додај производ</Link></div>
    {notice && <div className="admin-success-state" role="status">{notice}</div>}
    {writeError && <AdminErrorState message={writeError}/>}
    {error && <AdminErrorState message={error} retry={reload}/>}
    <section className="panel"><div className="toolbar">
      <label className="admin-search"><Search size={15}/><span className="sr-only">Пребарај производи</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Пребарај по име..."/></label>
      <select className="admin-select" aria-label="Филтрирај по категорија" value={category} onChange={event => setCategory(event.target.value)}><option value="all">Сите категории</option><option value="fruit">Овошје</option><option value="vegetable">Зеленчук</option><option value="other">Други категории</option></select>
      <select className="admin-select" aria-label="Филтрирај по достапност" value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">Секоја достапност</option><option value="available">Достапни</option><option value="out">Нема на залиха</option></select>
    </div>
    {loading && products.length === 0 ? <AdminLoadingState message="Се вчитуваат производите..."/> : <div className="table-wrap"><table className="product-table"><thead><tr><th>ПРОИЗВОД</th><th>КАТЕГОРИЈА</th><th>ЦЕНА</th><th>ДОСТАПНОСТ</th><th>АКЦИЈА</th><th>ПРОМЕНИ</th></tr></thead><tbody>{visible.map(product => <tr key={product.id} aria-busy={pending === product.id}>
      <td><div className="table-product"><AdminImage src={product.imageUrl}/><strong>{product.name}</strong></div></td>
      <td data-label="Категорија">{categoryLabel(product)}</td><td data-label="Цена">{product.salePrice ? <><s>{product.price}</s> <strong>{product.salePrice}</strong></> : product.price} ден/{product.unit}</td>
      <td data-label="Достапност"><Status type={product.is_available ? "good" : "out"}>{product.is_available ? "Достапно" : "Нема на залиха"}</Status></td>
      <td data-label="Акција">{product.salePrice ? <Status type="sale">Акција</Status> : "—"}</td>
      <td><div className="table-actions"><button className={`toggle ${product.is_available ? "on" : ""}`} disabled={pending !== null} aria-label={`${product.is_available ? "Означи дека нема на залиха" : "Означи како достапен"}: ${product.name}`} aria-pressed={product.is_available} onClick={() => { void toggle(product); }}><span/></button><Link className="small-action" href={`/admin/products/${product.id}/edit`} aria-label={`Уреди ${product.name}`}><Pencil/></Link><button className="small-action danger" disabled={pending !== null} aria-label={`Избриши ${product.name}`} onClick={() => { void remove(product); }}>{pending === product.id ? <LoaderCircle className="loading-spinner"/> : <Trash2/>}</button></div></td>
    </tr>)}</tbody></table>{visible.length === 0 && !error && <div className="empty-table">{products.length === 0 ? "Нема производи во каталогот. Додајте го првиот производ." : "Нема производи што одговараат на избраните филтри."}</div>}</div>}
    </section>
  </main></AdminShell>;
}

export function NewProductPage() { return <ProductFormPage/>; }
export function EditProductPage({ id }: { id: string }) { return <ProductFormPage productId={id}/>; }

function destination() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && (next === "/admin" || next.startsWith("/admin/")) && !next.startsWith("/admin/login") ? next : "/admin";
}
export function AdminLogin() {
  const session = useAdminSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  useEffect(() => { if (session.status === "authenticated") router.replace(destination()); }, [session.status, router]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try { await session.login({ email: email.trim(), password }); router.replace(destination()); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}><Link href="/" className="admin-logo"><BrandLogo/><small>ПАНЕЛ ЗА ПРОДАВНИЦАТА</small></Link><p>Најавете се со вашиот администраторски профил.</p>
    <div className="form-field"><label htmlFor="admin-email">Е-пошта</label><input id="admin-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></div>
    <div className="form-field"><label htmlFor="admin-password">Лозинка</label><div className="login-password-field"><input id="admin-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/><button className="login-password-toggle" type="button" aria-label={showPassword ? "Сокриј ја лозинката" : "Прикажи ја лозинката"} aria-controls="admin-password" disabled={busy} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}</button></div></div>
    <button className="admin-button" type="submit" disabled={busy || session.status === "loading"}>{busy ? <><LoaderCircle className="loading-spinner" size={15}/>Се најавува...</> : "Најави се"}</button>
    <p><Link className="text-link" href="/admin/forgot-password">Ја заборавивте лозинката?</Link></p>
    <p><Link className="text-link" href="/admin/register">Создај нов профил</Link></p>
    {(error || session.error) && <div className="admin-error-state" role="alert">{error || session.error}</div>}
  </form></main>;
}
