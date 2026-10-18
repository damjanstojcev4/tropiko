"use client";

import { useCallback, useEffect, useState } from "react";
import { productApi } from "@/lib/api/products";
import { errorMessage, isAuthorizationError } from "@/lib/api/client";
import { CATALOG_EVENT } from "@/lib/catalog-events";
import type { Product } from "@/types/product";

export function useCatalog({ enabled = true, saleOnly = false, adminToken, onUnauthorized }: { enabled?: boolean; saleOnly?: boolean; adminToken?: string | null; onUnauthorized?: () => void } = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    const request = adminToken ? productApi.listAdmin(adminToken, saleOnly ? { sale: true } : {}, controller.signal) : productApi.listPublic(saleOnly ? { sale: true } : {}, controller.signal);
    request.then(items => { if (!controller.signal.aborted) setProducts(items); })
      .catch(cause => { if (!controller.signal.aborted) { setError(errorMessage(cause)); if (adminToken && isAuthorizationError(cause)) onUnauthorized?.(); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, saleOnly, revision, adminToken, onUnauthorized]);
  useEffect(() => {
    if (!enabled) return;
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CATALOG_EVENT) : null;
    if (channel) channel.onmessage = reload;
    window.addEventListener("focus", reload); window.addEventListener(CATALOG_EVENT, reload);
    return () => { channel?.close(); window.removeEventListener("focus", reload); window.removeEventListener(CATALOG_EVENT, reload); };
  }, [enabled, reload]);
  return { products, setProducts, loading, error, reload };
}
