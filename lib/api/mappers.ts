import type { Category, Product, ProductUnit } from "@/types/product";
import type { ProductRow, ApiProductUnit } from "@/types/database";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/supabase/config";

export const unitToApi = { "кг": "kg", "парче": "piece", "пакување": "package", "5 кг": "kg_5", "10 кг": "kg_10", "7 кг": "kg_7", "3 кг": "kg_3" } as const;
const unitFromApi: Record<ApiProductUnit, ProductUnit> = { kg: "кг", piece: "парче", package: "пакување", kg_5: "5 кг", kg_10: "10 кг", kg_7: "7 кг", kg_3: "3 кг" };
export function normalizeCategory(category: string): Category {
  const value = category.trim().toLocaleLowerCase();
  if (value.includes("fruit") || value.includes("овош")) return "fruit";
  if (value.includes("vegetab") || value.includes("зеленч")) return "vegetable";
  return "other";
}
export function categoryLabel(product: Pick<Product, "category" | "apiCategory">): string {
  return product.category === "fruit" ? "Овошје" : product.category === "vegetable" ? "Зеленчук" : product.apiCategory || "Други производи";
}
export function fromApiProduct(record: ProductRow): Product {
  return {
    id: record.id, name: record.name, description: record.description || undefined,
    price: Number(record.price), category: record.category, apiCategory: record.category,
    unit: unitFromApi[record.unit], is_available: record.is_available,
    salePrice: record.is_on_sale && record.sale_price !== null ? Number(record.sale_price) : undefined,
    displayOrder: record.sort_order, imagePath: record.image_path,
    imageUrl: record.image_path ? createSupabaseBrowserClient().storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(record.image_path).data.publicUrl : "",
  };
}
