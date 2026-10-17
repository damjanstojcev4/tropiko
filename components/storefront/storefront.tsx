import Image from "next/image";
import Link from "next/link";
import { Apple, Carrot, Check, Leaf } from "lucide-react";
import { copy } from "@/lib/content";
import { fixtureProducts } from "@/lib/data/products";
import { ProductCatalog } from "@/components/storefront/product-catalog";
import { MobileNavigation } from "@/components/storefront/mobile-navigation";
import type { Category, Product } from "@/types/product";

export function Navbar() {
  return <header className="site-header"><div className="nav-shell"><Link className="brand" href="/" aria-label="Тропико — почетна"><span className="brand-fruit">✿</span><span className="brand-name">Tropiko</span><span className="brand-tag">ОВОШЕН РАЈ</span></Link><MobileNavigation/><Link href="#products" className="header-catalog">Производи <span>→</span></Link></div></header>;
}

export function HeroSection() {
  return <section className="hero"><div className="hero-content"><p className="eyebrow"><Leaf size={15}/> СЕЗОНСКО · СВЕЖО · ЛОКАЛНО</p><h1>Свежина секој ден<span>!</span></h1><p className="hero-description">{copy.heroDescription}</p><Link href="#products" className="hero-cta">Погледни ги производите <span>→</span></Link></div></section>;
}

function PriceLabel({product}:{product:Product}) { return <div className="price-wrap">{product.salePrice ? <><span className="price-old">{product.price} ден</span><span className="price-label">{product.salePrice} ден/{product.unit}</span></> : <span className="price-label">{product.price} ден/{product.unit}</span>}</div>; }
function productImageSource(source:string):string {
  try {
    const url=new URL(source);
    if(url.hostname==="images.unsplash.com"){
      url.searchParams.set("w","480");url.searchParams.set("h","360");url.searchParams.set("fit","crop");url.searchParams.set("crop","entropy");url.searchParams.set("q","72");
    }
    return url.toString();
  } catch { return source; }
}
export function ProductCard({product}:{product:Product}) {
  const discount=product.salePrice?Math.round((1-product.salePrice/product.price)*100):0;
  return <article className={`product-card ${product.is_available?"":"is-unavailable"}`}><div className="product-image"><Image src={productImageSource(product.imageUrl)} alt={product.name} width={480} height={360} sizes="(max-width: 620px) 45vw, (max-width: 950px) 30vw, 23vw" unoptimized loading="lazy"/><span className="product-leaf" aria-hidden="true">✦</span>{discount>0&&<span className="sale-badge">−{discount}%</span>}{!product.is_available&&<span className="stock-badge">Нема на залиха</span>}</div><div className="product-info"><h3>{product.name}</h3><PriceLabel product={product}/><div className={`availability ${product.is_available?"available":"unavailable"}`}>{product.is_available?<><Check size={13}/> Свежо и достапно</>:"Нема на залиха"}</div></div></article>;
}
export function ProductGrid({products}:{products:Product[]}) { return <div className="product-grid">{products.map(product=><ProductCard key={product.id} product={product}/>)}</div>; }
export function ProductCatalogServer({initialCategory,showHero=true,query="",saleOnly=false}:{initialCategory?:Category;showHero?:boolean;query?:string;saleOnly?:boolean}) {
  const initial=fixtureProducts.filter(p=>(!initialCategory||p.category===initialCategory)&&(!saleOnly||Boolean(p.salePrice))&&p.name.toLocaleLowerCase("mk").includes(query.trim().toLocaleLowerCase("mk"))).sort((a,b)=>(a.displayOrder??0)-(b.displayOrder??0));
  return <>{showHero&&<HeroSection/>}<main className="catalog" id="products"><div className="section-heading"><p className="eyebrow">ДИРЕКТНО ОД ПАЗАРОТ</p><h2>{saleOnly?"Сезонски акции":initialCategory==="fruit"?"Нашето овошје":initialCategory==="vegetable"?"Свеж зеленчук":"Избрано со љубов"}</h2><p>Свежи вкусови за вашата трпеза, секој ден.</p></div><ProductCatalog initialProducts={initial} initialCategory={initialCategory} query={query} saleOnly={saleOnly}/></main></>;
}
export function StoreFooter(){return <footer className="site-footer"><span className="footer-brand">Tropiko</span><p>{copy.footerSlogan}</p></footer>;}
export function ContactPage(){return <main className="contact-page"><div className="section-heading"><p className="eyebrow">ТУКА СМЕ ЗА ВАС</p><h1>Контакт</h1><p>За свежи идеи и прашања, со задоволство ќе ве пречекаме.</p></div><section className="contact-card"><span className="contact-mark">✿</span><h2>{copy.shopName}</h2><dl><div><dt>Адреса</dt><dd>{copy.address}</dd></div><div><dt>Телефон</dt><dd>{copy.phone}</dd></div><div><dt>Работно време</dt><dd>{copy.hours}</dd></div></dl><span className="contact-link">Контакт информациите ќе бидат ажурирани наскоро</span></section></main>;}

export { Apple, Carrot };
