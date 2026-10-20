import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/supabase/config";
import { forgetImageCleanup, queueImageCleanup } from "@/lib/image-cleanup";
import { fromApiProduct } from "./mappers";
import { ApiError, databaseError } from "./client";
import type { Product, ProductPayload, UploadedProductImage } from "@/types/product";
import type { ProductCategory, ProductPatch } from "@/types/database";

export interface CatalogQuery { category?: ProductCategory; search?: string; sale?: boolean; available?: boolean; }
export const MAX_IMAGE_BYTES = 5_242_880;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export function validateProductImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Изберете JPEG, PNG или WebP фотографија.";
  if (!file.size) return "Избраната датотека е празна.";
  if (file.size > MAX_IMAGE_BYTES) return "Фотографијата не смее да биде поголема од 5 MB.";
  return null;
}
async function listProducts(params: CatalogQuery = {}, signal?: AbortSignal): Promise<Product[]> {
  const supabase = createSupabaseBrowserClient();
  const products: Product[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from("products").select("*").order("sort_order").order("name").order("id").range(offset, offset + pageSize - 1);
    if (params.category) query = query.eq("category", params.category);
    if (params.sale !== undefined) query = query.eq("is_on_sale", params.sale);
    if (params.available !== undefined) query = query.eq("is_available", params.available);
    if (params.search?.trim()) query = query.ilike("name", `%${params.search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw databaseError(error);
    products.push(...data.map(fromApiProduct));
    if (data.length < pageSize) return products;
  }
}
async function get(id: string, signal?: AbortSignal): Promise<Product> {
  let query = createSupabaseBrowserClient().from("products").select("*").eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new ApiError("Производот не е пронајден.", 404);
  return fromApiProduct(data);
}
export const productApi = {
  listPublic: listProducts,
  listByCategory: (category: ProductCategory, signal?: AbortSignal) => listProducts({ category }, signal),
  listSale: (signal?: AbortSignal) => listProducts({ sale: true }, signal),
  listAdmin: (_token: string, params: CatalogQuery = {}, signal?: AbortSignal) => listProducts(params, signal),
  get,
  getAdmin: (id: string, _token: string, signal?: AbortSignal) => get(id, signal),
  create: async (payload: ProductPayload, _token: string) => {
    void _token;
    const { data, error } = await createSupabaseBrowserClient().from("products").insert(payload).select().single();
    if (error) throw databaseError(error);
    return fromApiProduct(data);
  },
  update: async (id: string, payload: ProductPatch, _token: string) => {
    void _token;
    const { data, error } = await createSupabaseBrowserClient().from("products").update(payload).eq("id", id).select().single();
    if (error) throw databaseError(error);
    return fromApiProduct(data);
  },
  setAvailability: async (id: string, is_available: boolean, token: string) => productApi.update(id, { is_available }, token),
  remove: async (id: string, _token: string) => {
    void _token;
    const { data, error } = await createSupabaseBrowserClient().from("products").delete().eq("id", id).select("id,image_path").single();
    if (error) throw databaseError(error);
    queueImageCleanup(data.image_path);
    return { success: true, cleanupPending: Boolean(data.image_path) };
  },
  uploadImage: async (productId: string, file: File): Promise<UploadedProductImage> => {
    const validation = validateProductImage(file);
    if (validation) throw new ApiError(validation, 400);
    const supabase = createSupabaseBrowserClient();
    const path = `products/${productId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const { error: reserveError } = await supabase.rpc("reserve_product_image", { p_product_id: productId, p_image_path: path });
    if (reserveError) throw databaseError(reserveError);
    const { data, error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
    if (error) { queueImageCleanup(path); throw databaseError(error); }
    queueImageCleanup(data.path); // Still unreferenced until attach succeeds; backend rechecks references before cleanup.
    return { path: data.path, productId };
  },
  attachImage: async (image: UploadedProductImage) => {
    const current = await get(image.productId);
    if (current.imagePath === image.path) { forgetImageCleanup(image.path); return current; }
    const { error } = await createSupabaseBrowserClient().rpc("attach_product_image", { p_product_id: image.productId, p_image_path: image.path });
    if (error) throw databaseError(error);
    forgetImageCleanup(image.path);
    queueImageCleanup(current.imagePath);
    return get(image.productId);
  },
  clearImage: async (productId: string) => {
    const current = await get(productId);
    const { error } = await createSupabaseBrowserClient().rpc("clear_product_image", { p_product_id: productId });
    if (error) throw databaseError(error);
    queueImageCleanup(current.imagePath);
    return get(productId);
  },
};
