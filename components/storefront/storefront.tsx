import Link from "next/link";
import { Apple, ArrowRight, ArrowUpRight, Carrot, Check, Clock3, Leaf, MapPin, Phone, Sprout } from "lucide-react";
import { copy } from "@/lib/content";
import { ProductCatalog } from "@/components/storefront/product-catalog";
import { MobileNavigation } from "@/components/storefront/mobile-navigation";
import { BrandLogo } from "@/components/brand-logo";
import type { Category } from "@/types/product";

export function Navbar() {
  return <header className="site-header"><div className="nav-shell">
      <Link className="brand" href="/" aria-label={`${copy.shopName} — почетна`}><BrandLogo priority/><span className="brand-wordmark">Banana<span>Makovo</span></span></Link>
      <MobileNavigation/>
      <Link href="/#products" className="header-catalog">Нашата понуда<ArrowUpRight size={16}/></Link>
    </div></header>;
}

export function HeroSection() {
  return <section className="hero"><div className="hero-shell">
    <div className="hero-content">
      <h1>{copy.hero.title}<br/><span>{copy.hero.accent}</span></h1>
      <p className="hero-description">{copy.hero.description}</p>
      <div className="hero-actions"><Link href="#products" className="hero-cta">{copy.hero.action}<ArrowRight size={17}/></Link></div>
    </div>
    <div className="hero-categories">
      <Link href="/fruit" className="category-tile fruit-tile"><Apple className="category-tile-icon" strokeWidth={1.3} aria-hidden="true"/><h2>{copy.nav.fruit}</h2><p>{copy.hero.fruitNote}</p><span className="tile-arrow"><ArrowUpRight size={19}/></span></Link>
      <Link href="/vegetables" className="category-tile vegetable-tile"><Carrot className="category-tile-icon" strokeWidth={1.3} aria-hidden="true"/><h2>{copy.nav.vegetables}</h2><p>{copy.hero.vegetableNote}</p><span className="tile-arrow"><ArrowUpRight size={19}/></span></Link>
    </div>
  </div><div className="benefit-strip">{copy.hero.benefits.map(benefit => <span key={benefit}><Check size={14} aria-hidden="true"/>{benefit}</span>)}</div></section>;
}

export function ProductCatalogServer({ initialCategory, showHero = true, saleOnly = false }: { initialCategory?: Category; showHero?: boolean; saleOnly?: boolean }) {
  const title = saleOnly ? copy.catalog.saleTitle : initialCategory === "fruit" ? copy.catalog.fruitTitle : initialCategory === "vegetable" ? copy.catalog.vegetableTitle : copy.catalog.title;
  return <>{showHero && <HeroSection/>}<main className={`catalog ${showHero ? "" : "catalog-page"}`} id="products"><div className="section-heading"><h2>{title}</h2></div><ProductCatalog initialCategory={initialCategory} saleOnly={saleOnly}/></main></>;
}

export function StoreFooter() {
  return <footer className="site-footer"><div className="footer-shell"><div className="footer-message"><Sprout size={26} strokeWidth={1.5}/><h2>{copy.footer.title}<br/><span>{copy.footer.accent}</span></h2><p>{copy.footer.description}</p></div><div className="footer-navigation"><p>{copy.footer.navLabel}</p><nav aria-label="Навигација во подножје"><Link href="/fruit">{copy.nav.fruit}<ArrowUpRight size={14}/></Link><Link href="/vegetables">{copy.nav.vegetables}<ArrowUpRight size={14}/></Link><Link href="/sale">{copy.nav.sale}<ArrowUpRight size={14}/></Link><Link href="/contact">{copy.nav.contact}<ArrowUpRight size={14}/></Link></nav></div></div><div className="footer-bottom"><span className="footer-brand">{copy.shopName}<span>© {new Date().getFullYear()}</span></span><span>{copy.footer.note}<Leaf size={13}/></span></div></footer>;
}

export function ContactPage() {
  const details = [{ icon: MapPin, label: copy.contact.address, value: copy.address }, { icon: Phone, label: copy.contact.phone, value: copy.phone }, { icon: Clock3, label: copy.contact.hours, value: copy.hours }];
  return <main className="contact-page"><div className="contact-intro"><p className="eyebrow">{copy.contact.eyebrow}</p><h1>{copy.contact.title}</h1><p>{copy.contact.description}</p><Link className="hero-secondary" href="/">{copy.contact.back}<ArrowUpRight size={16}/></Link></div><div className="contact-details">{details.map(({ icon: Icon, label, value }) => <section className="contact-card" key={label}><span className="contact-icon"><Icon size={22} strokeWidth={1.5}/></span><div><h2>{label}</h2><p>{value}</p></div></section>)}<p className="contact-note"><Leaf size={14}/>{copy.contact.note}</p></div></main>;
}
