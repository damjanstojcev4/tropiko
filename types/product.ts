export type Category = "fruit" | "vegetable";
export type ProductUnit = "кг" | "парче" | "пакување";
export interface Product {
  id: string; name: string; category: Category; price: number; unit: ProductUnit;
  imageUrl: string; description?: string; is_available: boolean;
  salePrice?: number; displayOrder?: number;
}
