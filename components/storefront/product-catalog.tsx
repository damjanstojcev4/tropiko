"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Carrot } from "lucide-react";
import Link from "next/link";
import { getProducts } from "@/lib/data/store";
import { ProductGrid } from "@/components/storefront/storefront";
import type { Category, Product } from "@/types/product";

export function ProductCatalog({initialProducts,initialCategory,query,saleOnly}:{initialProducts:Product[];initialCategory?:Category;query:string;saleOnly:boolean}) {
  const [products,setProducts]=useState(initialProducts);
  const [filter,setFilter]=useState<"all"|Category>(initialCategory??"all");
  useEffect(()=>{const saved=getProducts();setProducts(saved.filter(p=>(!initialCategory||p.category===initialCategory)&&(!saleOnly||Boolean(p.salePrice))&&p.name.toLocaleLowerCase("mk").includes(query.trim().toLocaleLowerCase("mk"))));},[initialCategory,query,saleOnly]);
  const visible=useMemo(()=>products.filter(p=>(filter==="all"||p.category===filter)&&(!saleOnly||Boolean(p.salePrice))).sort((a,b)=>(a.displayOrder??0)-(b.displayOrder??0)),[products,filter,saleOnly]);
  const filters:[["all"|Category,string,React.ReactNode,string],...["fruit"|"vegetable",string,React.ReactNode,string][]]=[["all","Сите",null,"/"],["fruit","Овошје",<Apple size={19} key="fruit"/>,"/fruit"],["vegetable","Зеленчук",<Carrot size={19} key="vegetable"/>,"/vegetables"]];
  return <><nav className="category-filters" aria-label="Филтрирај производи">{filters.map(([value,label,icon,href])=><Link key={value} href={href} className={`filter-pill ${filter===value?"active":""}`} aria-current={filter===value?"page":undefined} onClick={value==="all"?()=>setFilter("all"):undefined}>{icon}{label}</Link>)}</nav><ProductGrid products={visible}/>{visible.length===0&&<div className="empty-results"><h3>Не пронајдовме производи</h3><p>Обидете се со друга категорија.</p></div>}<p className="fixture-note"><span/> Прикажани се пример производи за преглед на дизајнот.</p></>;
}
