import Link from "next/link";
import { ArrowUpRight, Clock3, Heart, Leaf, MapPin, Phone, ShieldCheck } from "lucide-react";
import { copy } from "@/lib/content";
import { ProductCatalog } from "@/components/storefront/product-catalog";
import { MobileNavigation } from "@/components/storefront/mobile-navigation";
import Image from "next/image";

import type { Category } from "@/types/product";

export function Navbar() {
  return <header className="site-header"><div className="nav-shell">
    <Link className="brand" href="/" aria-label={`${copy.shopName} — почетна`}><Image className="brand-logo" src="/brand/navbar-logo.png" alt={copy.shopName} width={1440} height={2560} priority unoptimized/></Link>
    <MobileNavigation/>
  </div></header>;
}

export function HeroSection() {
  return <section className="hero"><div className="hero-shell">
    <div className="hero-content"><h1>Свежина<br/>секој ден!</h1><span className="hero-underline"/>
      <p className="hero-description">Овошје и зеленчук со одличен<br/>квалитет и цена.</p>
      <div className="hero-benefits"><span><Leaf/>Свежи<br/>производи</span><span><ShieldCheck/>Висок<br/>квалитет</span><span><Heart/>Внимателно<br/>избрано</span></div>
      <p className="hero-heritage">Повеќе од <strong>30 години</strong> со вас.</p>
    </div>
    <div className="hero-art" role="img" aria-label="Banana Makovo — свежо овошје и зеленчук"/>
    <Leaf className="hero-leaf hero-leaf-one" aria-hidden="true"/><Leaf className="hero-leaf hero-leaf-two" aria-hidden="true"/>
  </div></section>;
}

export function ProductCatalogServer({ initialCategory, showHero = true, saleOnly = false }: { initialCategory?: Category; showHero?: boolean; saleOnly?: boolean }) {
  const title = saleOnly ? copy.catalog.saleTitle : initialCategory === "fruit" ? copy.catalog.fruitTitle : initialCategory === "vegetable" ? copy.catalog.vegetableTitle : copy.catalog.title;
  return <>{showHero && <HeroSection/>}<main className={`catalog ${showHero ? "catalog-home" : "catalog-page"}`} id="products"><div className="section-heading"><h2>{title}</h2></div><ProductCatalog initialCategory={initialCategory} saleOnly={saleOnly}/></main></>;
}

export function StoreFooter() {
  return <footer className="site-footer"><div className="footer-foliage footer-foliage-left" aria-hidden="true"><Leaf/><Leaf/><Leaf/></div><p className="footer-slogan">Природата ни дава најдобро!</p><p className="footer-heritage">Повеќе од <strong>30 години</strong> со вас.</p><nav className="footer-links" aria-label="Навигација во подножје"><Link href="/fruit">Овошје</Link><span>·</span><Link href="/vegetables">Зеленчук</Link><span>·</span><Link href="/contact">Контакт</Link></nav><small>{copy.shopName} © {new Date().getFullYear()}</small><div className="footer-foliage footer-foliage-right" aria-hidden="true"><Leaf/><Leaf/><Leaf/></div></footer>;
}

export function ContactPage() {
  const details = [{ icon: MapPin, label: copy.contact.address, value: copy.address }, { icon: Phone, label: copy.contact.phone, value: copy.phone }, { icon: Clock3, label: copy.contact.hours, value: copy.hours }];
  return <main className="contact-page"><div className="contact-intro"><p className="eyebrow">{copy.contact.eyebrow}</p><h1>{copy.contact.title}</h1><p>{copy.contact.description}</p><Link className="hero-secondary" href="/">{copy.contact.back}<ArrowUpRight size={16}/></Link></div><div className="contact-details">{details.map(({ icon: Icon, label, value }) => <section className="contact-card" key={label}><span className="contact-icon"><Icon size={22} strokeWidth={1.5}/></span><div><h2>{label}</h2><p>{value}</p></div></section>)}<p className="contact-note"><Leaf size={14}/>{copy.contact.note}</p></div></main>;
}
