// The walkthrough does not specify cleanup RPC signatures or a deployed worker.
// Retain only public object keys for a future protected cleanup operation; never
// delete Storage objects without the backend's reference/retirement checks.
const KEY = "banana-makovo-pending-image-cleanup";
export function queueImageCleanup(path?: string | null) {
  if (!path || typeof window === "undefined") return;
  try {
    const previous: unknown = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    const paths = Array.isArray(previous) ? previous.filter((item): item is string => typeof item === "string") : [];
    window.localStorage.setItem(KEY, JSON.stringify([...new Set([...paths, path])]));
  } catch { /* Database retirement records remain authoritative if browser storage is unavailable. */ }
}
export function forgetImageCleanup(path: string) {
  try {
    const previous: unknown = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    if (Array.isArray(previous)) window.localStorage.setItem(KEY, JSON.stringify(previous.filter(item => typeof item === "string" && item !== path)));
  } catch { /* The backend must always recheck references regardless of this local hint. */ }
}
