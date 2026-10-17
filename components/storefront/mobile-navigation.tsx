"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { copy } from "@/lib/content";

const links = [["/", copy.nav.home], ["/fruit", copy.nav.fruit], ["/vegetables", copy.nav.vegetables], ["/sale", copy.nav.sale], ["/contact", copy.nav.contact]] as const;

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return <>
    <button className="menu-toggle" type="button" aria-label={open ? "Затвори мени" : "Отвори мени"} aria-expanded={open} aria-controls="store-navigation" onClick={() => setOpen(value => !value)}>
      {open ? <X size={23} aria-hidden="true"/> : <Menu size={23} aria-hidden="true"/>}
    </button>
    <nav id="store-navigation" className={`main-nav ${open ? "is-open" : ""}`} aria-label="Главна навигација">
      {links.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    </nav>
  </>;
}
