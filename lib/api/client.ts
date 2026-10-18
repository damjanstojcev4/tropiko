import { authBaseUrl, productsBaseUrl } from "./config";

export class ApiError extends Error {
  constructor(message: string, public status: number, public param?: string, public details?: string) { super(message); this.name = "ApiError"; }
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Барањето не успеа. Обидете се повторно.";
}
export function isAuthorizationError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

interface RequestOptions extends RequestInit { group?: "products" | "auth"; token?: string; }

function responseError(body: unknown, status: number, httpSuccess: boolean): ApiError | null {
  const data = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  const code = typeof data?.code === "string" ? data.code.toLowerCase() : "";
  const thrown = data?.statement === "Throw Error";
  const knownCode = code.startsWith("error_") || ["accessdenied", "unauthorized", "inputerror", "notfound"].includes(code);
  if (httpSuccess && !thrown && !knownCode && data?.success !== false && data?.success !== "false") return null;

  let errorStatus = status;
  if (httpSuccess) {
    errorStatus = /unauthorized|unauthenticated/.test(code) ? 401 : /accessdenied|forbidden/.test(code) ? 403 : /input|validation/.test(code) ? 400 : /notfound/.test(code) ? 404 : 500;
  }
  const fallback = errorStatus === 401 ? "Сесијата е истечена или податоците за најава не се точни." : errorStatus === 403 ? "Немате администраторски пристап." : `Барањето не успеа (${errorStatus}).`;
  const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : typeof data?.payload === "string" ? data.payload : fallback;
  const payload = data?.payload && typeof data.payload === "object" ? data.payload as Record<string, unknown> : null;
  const param = typeof payload?.param === "string" ? payload.param : undefined;

  const roles = message.match(/Required:\s*(member|admin|super_admin)\s*,\s*Actual:\s*(member|admin|super_admin)/i);
  const levels: Record<string, number> = { member: 1, admin: 2, super_admin: 3 };
  if (roles && levels[roles[2].toLowerCase()] >= levels[roles[1].toLowerCase()]) {
    // This is a contradictory backend role check, not an expired browser session.
    return new ApiError("Серверската проверка на улоги е погрешно поставена. Вашата улога има потребен пристап, но Xano го одбива. Потребна е исправка во Quick Start/enforce_role.", 500, param, message);
  }
  if (/Unable to locate input:\s*(?:\$input\.)?file\.(?:size|mime)\b/i.test(message)) {
    return new ApiError("Серверот за прикачување има грешка во обработката на датотеката. Потребна е исправка во Xano; не треба да внесувате патека или повторно да ја избирате фотографијата.", 500, param, message);
  }
  return new ApiError(message, errorStatus, param);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { group = "products", token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // FormData must retain the browser-generated multipart boundary.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${group === "auth" ? authBaseUrl : productsBaseUrl}${path}`, { ...init, headers, cache: "no-store", signal: controller.signal });
    if (response.status === 204) return undefined as T;
    const body: unknown = await response.json().catch(() => null);
    const failure = responseError(body, response.status, response.ok);
    if (failure) throw failure;
    if (body === null) throw new ApiError("Серверот врати празен или невалиден JSON-одговор.", 500);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (init.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? "Барањето траеше предолго. Обидете се повторно." : "Не може да се поврземе со серверот. Проверете ја интернет врската и обидете се повторно.", 0);
  } finally { clearTimeout(timeout); init.signal?.removeEventListener("abort", abort); }
}
