// Minimal client contract from the supplied walkthrough, not a generated schema dump.
// Replace with Supabase CLI-generated types when the project schema export is available.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type ApplicationRole = "member" | "admin" | "super_admin";
export type ProductCategory = "fruit" | "vegetable" | "other";
export type ApiProductUnit = "kg" | "piece" | "package" | "kg_5" | "kg_10" | "kg_7" | "kg_3";
export type ProductRow = {
  id: string; name: string; description: string; category: ProductCategory; price: number; unit: ApiProductUnit;
  is_available: boolean; is_on_sale: boolean; sale_price: number | null; sort_order: number;
  image_path: string | null; created_at: string; updated_at: string;
};
export type ProductInsert = Pick<ProductRow, "name" | "price" | "category" | "unit"> & Partial<Omit<ProductRow, "name" | "price" | "category" | "unit" | "image_path" | "created_at" | "updated_at">>;
export type ProductPatch = Partial<Omit<ProductInsert, "id">>;
export type ProfileRow = { id: string; name: string; email: string; role: ApplicationRole; created_at: string; updated_at: string; };
export type AuditRow = { id: string; created_at: string; actor_id: string | null; action: string; target_user_id: string | null; product_id: string | null; details: Json; };
export interface Database {
  public: {
    Tables: {
      products: { Row: ProductRow; Insert: ProductInsert; Update: ProductPatch; Relationships: [] };
      profiles: { Row: ProfileRow; Insert: never; Update: { name?: string }; Relationships: [] };
      audit_logs: { Row: AuditRow; Insert: never; Update: never; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      reserve_product_image: { Args: { p_product_id: string; p_image_path: string }; Returns: Json };
      attach_product_image: { Args: { p_product_id: string; p_image_path: string }; Returns: Json };
      clear_product_image: { Args: { p_product_id: string }; Returns: Json };
      set_user_role: { Args: { p_user_id: string; p_role: ApplicationRole }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
