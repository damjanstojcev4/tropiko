import type { ProductCategory, ProductInsert } from "./database";
export type Category = ProductCategory;
export type ProductUnit = "кг" | "парче" | "пакување" | "5 кг" | "10 кг" | "7 кг" | "3 кг";
export interface Product {
  id: string; name: string; category: Category; price: number; unit: ProductUnit;
  imageUrl: string; imagePath?: string | null; description?: string; is_available: boolean;
  salePrice?: number; displayOrder?: number; apiCategory?: string;
}
export type ProductPayload = ProductInsert;
export interface UploadedProductImage { path: string; productId: string; }
