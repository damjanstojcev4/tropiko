export type Category = "fruit" | "vegetable" | "other";
export type ProductUnit = "кг" | "парче" | "пакување";
export interface Product {
  id: string; name: string; category: Category; price: number; unit: ProductUnit;
  imageUrl: string; description?: string; is_available: boolean;
  salePrice?: number; displayOrder?: number;
  apiCategory?: string; image?: XanoAttachment | null;
}

export interface XanoAttachment {
  access: "public"; path: string; name: string; type: "image"; size: number; mime: string;
  meta: { width: number; height: number; validated?: boolean }; url?: string;
}
export type ApiProductUnit = "kg" | "piece" | "package";
export interface XanoProduct {
  id: number; created_at?: number; name: string; description?: string | null; price: number;
  category?: string | null; unit: ApiProductUnit; is_available: boolean;
  is_on_sale: boolean; sale_price?: number | null; sort_order?: number | null; image?: XanoAttachment | null;
}
export interface ProductPayload {
  name: string; description?: string; price: number; category: string; unit: ApiProductUnit;
  is_available: boolean; is_on_sale: boolean; sale_price?: number | null; sort_order?: number;
  image?: XanoAttachment; remove_image?: boolean;
}
export interface CatalogPage {
  itemsReceived: number; curPage: number; nextPage: number | null; prevPage: number | null;
  offset: number; perPage: number; items: XanoProduct[]; itemsTotal?: number; pageTotal?: number;
}
