"use client";

import { fixtureProducts } from "@/lib/data/products";
import type { Product } from "@/types/product";

const key = "tropiko-dev-products";
let memoryProducts: Product[] | null = null;
export function getProducts(): Product[] {
  if (typeof window === "undefined") return memoryProducts ?? fixtureProducts;
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as Product[] : fixtureProducts; }
  catch { return memoryProducts ?? fixtureProducts; }
}
export function saveProducts(products: Product[]): void {
  memoryProducts = products;
  try { window.localStorage.setItem(key, JSON.stringify(products)); } catch { /* Keep changes for this page session if storage is unavailable. */ }
}
export function resetProducts(): void { memoryProducts = null; try { window.localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
