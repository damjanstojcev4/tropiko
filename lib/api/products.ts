import { apiRequest } from "./client";
import type { Category, Product } from "@/types/product";

// Logical integration surface only. Map paths and payloads after Xano documentation is supplied.
export const productApi = {
  listPublic: () => apiRequest<Product[]>("/products"),
  listByCategory: (category: Category) => apiRequest<Product[]>(`/products?category=${category}`),
  listSale: () => apiRequest<Product[]>("/products?sale=true"),
  get: (id: string) => apiRequest<Product>(`/products/${id}`),
  listAdmin: () => apiRequest<Product[]>("/admin/products"),
  create: (product: Omit<Product, "id">) => apiRequest<Product>("/admin/products", { method: "POST", body: JSON.stringify(product) }),
  update: (id: string, product: Partial<Product>) => apiRequest<Product>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(product) }),
  setAvailability: (id: string, is_available: boolean) => apiRequest<Product>(`/admin/products/${id}/availability`, { method: "PATCH", body: JSON.stringify({ is_available }) }),
  remove: (id: string) => apiRequest<void>(`/admin/products/${id}`, { method: "DELETE" }),
};
