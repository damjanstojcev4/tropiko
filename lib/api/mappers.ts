import type { Category, Product, ProductUnit, XanoProduct } from "@/types/product";
import { xanoOrigin } from "./config";

export const unitToApi = { "кг": "kg", "парче": "piece", "пакување": "package" } as const;
const unitFromApi: Record<XanoProduct["unit"], ProductUnit> = { kg: "кг", piece: "парче", package: "пакување" };

export function normalizeCategory(category: string): Category {
  const value = category.trim().toLocaleLowerCase();
  if (value.includes("fruit") || value.includes("овош")) return "fruit";
  if (value.includes("vegetab") || value.includes("зеленч")) return "vegetable";
  return "other";
}
export function categoryLabel(product: Pick<Product, "category" | "apiCategory">): string {
  return product.category === "fruit" ? "Овошје" : product.category === "vegetable" ? "Зеленчук" : product.apiCategory || "Без категорија";
}
export function fromApiProduct(record: XanoProduct): Product {
  const salePrice = record.is_on_sale && record.sale_price && record.sale_price > 0 && record.sale_price < record.price ? Number(record.sale_price) : undefined;
  return {
    id: String(record.id), name: record.name, description: record.description || undefined,
    price: Number(record.price), category: normalizeCategory(record.category || ""), apiCategory: record.category || "",
    unit: unitFromApi[record.unit], is_available: record.is_available, salePrice,
    displayOrder: record.sort_order ?? 0, image: record.image,
    imageUrl: record.image?.url || (record.image?.path ? new URL(record.image.path, xanoOrigin).toString() : ""),
  };
}
