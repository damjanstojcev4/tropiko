"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Apple, Carrot, LayoutGrid, Leaf } from "lucide-react";
import { copy } from "@/lib/content";
import { useCatalog } from "@/lib/use-catalog";
import { compareProductOrder } from "@/lib/product-order";
import { ProductGrid } from "@/components/storefront/product-grid";
import type { Category } from "@/types/product";

const filters = [
  { value: "all", label: copy.catalog.all, href: "/", icon: LayoutGrid },
  { value: "fruit", label: copy.nav.fruit, href: "/fruit", icon: Apple },
  { value: "vegetable", label: copy.nav.vegetables, href: "/vegetables", icon: Carrot },
] as const;

export function ProductCatalog({ initialCategory, saleOnly }: { initialCategory?: Category; saleOnly: boolean }) {

  const { products, loading, error, reload } = useCatalog({ saleOnly });
  const visible = useMemo(() => products.filter(product => (!initialCategory || product.category === initialCategory) && (!saleOnly || Boolean(product.salePrice))).sort(compareProductOrder), [products, initialCategory, saleOnly]);

  return <>
    <div className="catalog-tools">
      <nav className="category-filters" aria-label="Филтрирај производи">
        {filters.map(({ value, label, href, icon: Icon }) => <Link key={value} href={href} className={`filter-pill ${(initialCategory ?? "all") === value ? "active" : ""}`} aria-current={(initialCategory ?? "all") === value ? "page" : undefined}><Icon size={17} aria-hidden="true"/>{label}</Link>)}
      </nav>
      <span className="product-count">{loading && products.length === 0 ? "Се вчитува..." : `${String(visible.length).padStart(2, "0")} ${copy.catalog.count}`}</span>
    </div>
    {error && <div className="catalog-error" role="alert"><p>{error}</p><button type="button" className="admin-button secondary" onClick={reload}>Обиди се повторно</button></div>}
    <div aria-busy={loading}>{loading && products.length === 0 ? <div className="product-grid" role="status"><span className="sr-only">Се вчитува понудата...</span>{Array.from({ length: 8 }, (_, index) => <div className="product-skeleton" key={index} aria-hidden="true"><div/><span/><span/></div>)}</div> : <ProductGrid products={visible}/>}</div>
    {!loading && !error && visible.length === 0 && <div className="empty-results"><Leaf size={28}/><h3>{copy.catalog.emptyTitle}</h3><p>{copy.catalog.emptyDescription}</p></div>}
  </>;
}
