"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { copy } from "@/lib/content";

const links = [["/", copy.nav.home], ["/fruit", copy.nav.fruit], ["/vegetables", copy.nav.vegetables], ["/sale", copy.nav.sale], ["/contact", copy.nav.contact]] as const;

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); }
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !navRef.current?.contains(event.target) && !toggleRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [open]);

  return <>
    <button ref={toggleRef} className="menu-toggle" type="button" aria-label={open ? "Затвори мени" : "Отвори мени"} aria-expanded={open} aria-controls="store-navigation" onClick={() => setOpen(value => !value)}>
      {open ? <X size={23} aria-hidden="true"/> : <Menu size={23} aria-hidden="true"/>}
    </button>
    <nav ref={navRef} id="store-navigation" className={`main-nav ${open ? "is-open" : ""}`} aria-label="Главна навигација">
      {links.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    </nav>
  </>;
}
