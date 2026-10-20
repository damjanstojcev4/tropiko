import { Leaf } from "lucide-react";

import { productImageSource } from "@/lib/images";

import { ProductPhoto } from "@/components/product-photo";
import type { Product } from "@/types/product";

function PriceLabel({ product }: { product: Product }) {
  return <div className="price-wrap">
    <span className="price-label"><strong>{product.salePrice ?? product.price}</strong><span>ден<span className="price-unit"> / {product.unit}</span></span></span>
    {product.salePrice && <s className="price-old">{product.price} ден</s>}
  </div>;
}

export function ProductCard({ product }: { product: Product }) {
  const discount = product.salePrice ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
  return <article className={`product-card ${product.is_available ? "" : "is-unavailable"}`}>
    <div className="product-image"><Leaf className="product-leaf" aria-hidden="true"/>
      <ProductPhoto key={product.imageUrl} src={product.imageUrl ? productImageSource(product.imageUrl) : ""} alt={product.name}/>
      {discount > 0 && <span className="sale-badge">−{discount}%</span>}
    </div>
    <div className="product-info">

      <h3>{product.name}</h3>
      <PriceLabel product={product}/>
      {!product.is_available && <p className="availability unavailable">Нема на залиха</p>}
    </div>
  </article>;
}

export function ProductGrid({ products }: { products: Product[] }) {
  return <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div>;
}
