export const CATALOG_EVENT = "banana-makovo-catalog-change";
export function publishCatalogChange(): void {
  window.dispatchEvent(new Event(CATALOG_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CATALOG_EVENT); channel.postMessage("changed"); channel.close();
  }
}
