export const productsBaseUrl = (process.env.NEXT_PUBLIC_XANO_API_BASE_URL || "https://x8ki-letl-twmt.n7.xano.io/api:B2FDnMho").replace(/\/+$/, "");
export const authBaseUrl = (process.env.NEXT_PUBLIC_XANO_AUTH_API_BASE_URL || `${new URL(productsBaseUrl).origin}/api:EOaIUs6k`).replace(/\/+$/, "");
export const xanoOrigin = new URL(productsBaseUrl).origin;
