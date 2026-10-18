"use client";

import { fixtureProducts } from "@/lib/data/products";
import type { Product } from "@/types/product";

const key = "banana-makovo-dev-products";
const legacyKey = "tropiko-dev-products";
let memoryProducts: Product[] | null = null;
export function getProducts(): Product[] {
  if (typeof window === "undefined") return memoryProducts ?? fixtureProducts;
  try {
    const value = window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey);
    if (!value) return fixtureProducts;
    const products = JSON.parse(value) as Product[];
    // Keep existing development edits when upgrading from the previous shop name.
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
    return products;
  }
  catch { return memoryProducts ?? fixtureProducts; }
}
export function saveProducts(products: Product[]): void {
  memoryProducts = products;
  try { window.localStorage.setItem(key, JSON.stringify(products)); } catch { /* Keep changes for this page session if storage is unavailable. */ }
}
export function resetProducts(): void { memoryProducts = null; try { window.localStorage.removeItem(key); window.localStorage.removeItem(legacyKey); } catch { /* Storage may be unavailable. */ } }
