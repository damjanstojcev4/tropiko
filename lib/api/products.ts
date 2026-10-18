import { apiRequest, ApiError } from "./client";
import { fromApiProduct } from "./mappers";
import type { CatalogPage, Product, ProductPayload, XanoAttachment, XanoProduct } from "@/types/product";

export interface CatalogQuery { category?: string; search?: string; sale?: boolean; available?: boolean; }
async function listProducts(params: CatalogQuery = {}, signal?: AbortSignal, token?: string): Promise<Product[]> {
  const products: Product[] = [];
  const visited = new Set<number>();
  let page: number | null = 1;
  while (page !== null) {
    if (visited.has(page)) throw new ApiError("Серверот врати невалидна пагинација.", 0);
    visited.add(page);
    const query: URLSearchParams = new URLSearchParams({ page: String(page), per_page: "100" });
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(token && key === "available" ? "is_available" : key, String(value)); });
    const result: CatalogPage | XanoProduct[] | null = await apiRequest<CatalogPage | XanoProduct[] | null>(`${token ? "/admin/products" : "/products"}?${query}`, { signal, token });
    // Xano list endpoints can return either a direct array or a pagination envelope.
    // A direct array has no continuation metadata, so consume it once.
    const items = Array.isArray(result) ? result : result?.items;
    if (!Array.isArray(items)) throw new ApiError("Серверот врати невалидна листа на производи.", 0);
    products.push(...items.map(fromApiProduct));
    const nextPage: number | null = Array.isArray(result) ? null : result?.nextPage ?? null;
    if (nextPage !== null && (!Number.isInteger(nextPage) || nextPage < 1)) throw new ApiError("Серверот врати невалидна пагинација.", 0);
    page = nextPage;
  }
  return products;
}

export const MAX_IMAGE_BYTES = 5_242_880;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validateProductImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Изберете JPEG, PNG или WebP фотографија.";
  if (file.size === 0) return "Избраната датотека е празна.";
  if (file.size > MAX_IMAGE_BYTES) return "Фотографијата не смее да биде поголема од 5 MB.";
  return null;
}

function requireImagePath(image: unknown): asserts image is XanoAttachment {
  if (!image || typeof image !== "object" || !("path" in image) || typeof image.path !== "string" || !image.path.trim()) {
    throw new ApiError("Серверот не врати зачувана фотографија. Производот не е зачуван. Не треба рачно да внесувате патека или адреса.", 0, "image.path");
  }
}

function describeUploadResponse(value: unknown, depth = 0): unknown {
    if (value === null) return "null";
    if (typeof value === "string") return value.trim() ? `string (${value.length} characters)` : "empty string";
    if (typeof value !== "object") return typeof value;
    if (depth > 5) return Array.isArray(value) ? "array" : "object";
    if (Array.isArray(value)) return { type: "array", count: value.length, sample: value.slice(0, 2).map(item => describeUploadResponse(item, depth + 1)) };
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => [key, /token|password|authorization|cookie|secret/i.test(key) ? "[redacted]" : describeUploadResponse(item, depth + 1)]));
}
function uploadResponseDetails(response: unknown): string {
  // Field names and value types only: never include tokens, file content, or personal values.
  return JSON.stringify({ endpoint: "POST /admin/uploads/product-image", response: describeUploadResponse(response) }, null, 2).slice(0, 12000);
}

export function parseUploadedProductImage(response: unknown): XanoAttachment {
  const attachments = new Map<string, XanoAttachment>();
  function visit(value: unknown, depth: number): void {
    if (!value || typeof value !== "object" || depth > 6) return;
    if ("path" in value && typeof value.path === "string" && value.path.trim()
      && "name" in value && typeof value.name === "string") {
      requireImagePath(value);
      attachments.set(value.path, value);
      return;
    }
    // Select the native attachment by its fields, without assuming an API wrapper name.
    for (const nested of Object.values(value)) visit(nested, depth + 1);
  }
  visit(response, 0);
  if (attachments.size !== 1) {
    throw new ApiError(attachments.size > 1
      ? "Серверот врати повеќе фотографии и не потврди која е избрана. Производот не е зачуван."
      : "Серверот го прими прикачувањето, но не врати податоци за зачуваната фотографија. Не треба рачно да внесувате патека. Испратете ги деталите подолу за да го поправиме поврзувањето.", 0, "image.path", uploadResponseDetails(response));
  }
  return attachments.values().next().value!;
}
function productBody(product: Partial<ProductPayload>): string {
  if (product.image !== undefined) requireImagePath(product.image);
  return JSON.stringify(product);
}

async function saveProduct(path: string, method: "POST" | "PATCH", product: Partial<ProductPayload>, token: string): Promise<Product> {
  try {
    return fromApiProduct(await apiRequest<XanoProduct>(path, { method, token, body: productBody(product) }));
  } catch (cause) {
    if (cause instanceof ApiError && cause.param === "image.path") {
      cause.details = JSON.stringify({ stage: "save product", status: cause.status, parameter: cause.param, sentImage: describeUploadResponse(product.image) }, null, 2).slice(0, 12000);
    }
    throw cause;
  }
}

export const productApi = {
  listPublic: listProducts,
  listByCategory: (category: string, signal?: AbortSignal) => listProducts({ category }, signal),
  listSale: (signal?: AbortSignal) => listProducts({ sale: true }, signal),
  listAdmin: (token: string, params: CatalogQuery = {}, signal?: AbortSignal) => listProducts(params, signal, token),
  get: async (id: string, signal?: AbortSignal) => fromApiProduct(await apiRequest<XanoProduct>(`/products/${encodeURIComponent(id)}`, { signal })),
  getAdmin: async (id: string, token: string, signal?: AbortSignal) => fromApiProduct(await apiRequest<XanoProduct>(`/admin/products/${encodeURIComponent(id)}`, { token, signal })),
  create: (product: ProductPayload, token: string) => saveProduct("/admin/products", "POST", product, token),
  update: (id: string, product: Partial<ProductPayload>, token: string) => saveProduct(`/admin/products/${encodeURIComponent(id)}`, "PATCH", product, token),
  setAvailability: async (id: string, is_available: boolean, token: string) => fromApiProduct(await apiRequest<XanoProduct>(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", token, body: JSON.stringify({ is_available }) })),
  remove: (id: string, token: string) => apiRequest<{ success: boolean; message: string }>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE", token }),
  uploadImage: async (file: File, token: string): Promise<XanoAttachment> => {
    const error = validateProductImage(file);
    if (error) throw new ApiError(error, 422);
    const body = new FormData(); body.append("file", file);
    const response = await apiRequest<unknown>("/admin/uploads/product-image", { method: "POST", token, body });
    return parseUploadedProductImage(response);
  },
};
