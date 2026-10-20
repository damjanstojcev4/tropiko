"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, KeyRound, LayoutDashboard, Leaf, LogOut, Users } from "lucide-react";
import { copy } from "@/lib/content";
import { BrandLogo } from "@/components/brand-logo";
import { ProductPhoto } from "@/components/product-photo";
import { productImageSource } from "@/lib/images";
import { AdminGuard, useAdminSession } from "./admin-session";
import { isSuperAdmin } from "@/lib/auth";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, logout } = useAdminSession();
  const links = [{ href: "/admin", icon: LayoutDashboard, label: "Контролна табла" }, { href: "/admin/products", icon: Boxes, label: "Производи" }, { href: "/admin/users", icon: Users, label: "Корисници" }, { href: "/admin/security", icon: KeyRound, label: "Моја лозинка" }];
  if (isSuperAdmin(user?.role)) links.push({ href: "/admin/audit", icon: ClipboardList, label: "Дневник" });
  return <AdminGuard><div className="admin-shell"><aside className="admin-sidebar">
    <Link className="admin-logo" href="/"><BrandLogo/><small>ПАНЕЛ ЗА ПРОДАВНИЦАТА</small></Link><span className="admin-nav-label">ПРОДАВНИЦА</span>
    <nav className="admin-nav">{links.map(({ href, icon: Icon, label }) => <Link key={href} href={href} aria-current={path === href || href !== "/admin" && path.startsWith(href) ? "page" : undefined}><Icon/>{label}</Link>)}<Link href="/" target="_blank" rel="noopener noreferrer"><Leaf/>Отвори продавница</Link></nav>
    <div className="admin-side-note">Управувајте со производите, фотографиите и свежата понуда.</div>
  </aside><div className="admin-main"><header className="admin-header"><strong>{copy.shopName} · Администрација</strong><div className="admin-header-right"><span>{user?.name}</span><button className="small-action" type="button" onClick={logout} aria-label="Одјави се" title="Одјави се"><LogOut size={16}/></button></div></header>{children}</div></div></AdminGuard>;
}
export function AdminImage({ src }: { src: string }) {
  return <span className="mini-image"><ProductPhoto key={src} src={src ? productImageSource(src, 96, 96) : ""} alt="Производ" width={42} height={42} compact/></span>;
}
export function Status({ children, type }: { children: React.ReactNode; type: "good" | "out" | "sale" }) { return <span className={`status-badge ${type}`}>{children}</span>; }
