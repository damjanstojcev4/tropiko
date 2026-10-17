const apiBaseUrl = process.env.NEXT_PUBLIC_XANO_API_BASE_URL;
export function isXanoConfigured(): boolean { return Boolean(apiBaseUrl); }
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new Error("Xano API не е конфигуриран. Внесете NEXT_PUBLIC_XANO_API_BASE_URL и поврзете ја документацијата.");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`API барањето не успеа (${response.status}).`);
  return response.json() as Promise<T>;
}
