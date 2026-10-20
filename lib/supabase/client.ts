import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabaseConfig } from "./config";

export function createSupabaseBrowserClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient<Database>(url, key);
}
