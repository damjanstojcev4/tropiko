import { createClient } from "npm:@supabase/supabase-js@2.118.0";

export class HttpFailure extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}
export const roles = new Set(["member", "admin", "super_admin"]);
export function validatePassword(value: unknown): value is string { return typeof value === "string" && value.length >= 8 && /\p{L}/u.test(value) && /[0-9]/.test(value); }
export function validateUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function configuredKey(mapName: string, labelName: string): string {
  const label = Deno.env.get(labelName);
  const raw = Deno.env.get(mapName);
  if (!label || !raw) throw new HttpFailure(503, `Configure ${labelName} and the corresponding Supabase key map.`);
  let keys: Record<string, unknown>;
  try { keys = JSON.parse(raw); } catch { throw new HttpFailure(503, "Invalid server key configuration."); }
  const key = keys[label];
  if (typeof key !== "string" || !key) throw new HttpFailure(503, `The configured label in ${labelName} is unavailable.`);
  return key;
}
export async function requireSuperAdmin(request: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new HttpFailure(503, "Supabase URL is not configured.");
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpFailure(401, "Authentication required.");
  const userClient = createClient(url, configuredKey("SUPABASE_PUBLISHABLE_KEYS", "BANANA_PUBLISHABLE_KEY_NAME"), {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: identity, error: identityError } = await userClient.auth.getUser(authorization.slice(7));
  if (identityError || !identity.user) throw new HttpFailure(401, "Invalid or expired session.");
  if (!identity.user.email_confirmed_at) throw new HttpFailure(403, "A verified email is required.");
  const { data: profile, error: profileError } = await userClient.from("profiles").select("id,role").eq("id", identity.user.id).single();
  if (profileError || profile?.role !== "super_admin") throw new HttpFailure(403, "Super administrator access required.");
  // Create the privileged client only after verifying identity and current role.
  const admin = createClient(url, configuredKey("SUPABASE_SECRET_KEYS", "BANANA_SECRET_KEY_NAME"), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { userClient, admin, actorId: identity.user.id };
}
export async function audit(admin: Awaited<ReturnType<typeof requireSuperAdmin>>["admin"], actorId: string, action: string, targetId: string, details: Record<string, unknown> = {}) {
  const { error } = await admin.from("audit_logs").insert({ actor_id: actorId, action, target_user_id: targetId, details });
  if (error) throw new HttpFailure(503, "Audit logging failed.");
}
export function serveAdmin(handler: (request: Request) => Promise<{ body: unknown; status?: number }>) {
  Deno.serve(async request => {
    const origin = request.headers.get("Origin");
    const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3000").split(",").map(value => value.trim());
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
    if (origin && allowed.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
    if (origin && !allowed.includes(origin)) return new Response(JSON.stringify({ error: "Origin is not allowed." }), { status: 403, headers });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers });
    try { const result = await handler(request); return new Response(JSON.stringify(result.body), { status: result.status ?? 200, headers }); }
    catch (cause) {
      const failure = cause instanceof HttpFailure ? cause : new HttpFailure(500, "The operation could not be completed.");
      return new Response(JSON.stringify({ error: failure.message, ...failure.extra }), { status: failure.status, headers });
    }
  });
}
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try { const body = await request.json(); if (body && typeof body === "object" && !Array.isArray(body)) return body; } catch { /* Invalid JSON. */ }
  throw new HttpFailure(400, "A JSON object is required.");
}
