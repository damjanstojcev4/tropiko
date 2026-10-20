import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const allowedNext = new Set(["/admin", "/admin/login", "/account/update-password", "/admin/reset-password"]);
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get("next");
  const type = params.get("type");
  const next = requested && allowedNext.has(requested) ? requested : type === "recovery" ? "/account/update-password" : "/admin/login";
  const supabase = await createSupabaseServerClient();
  const tokenHash = params.get("token_hash"), code = params.get("code");
  let success = false;
  if (tokenHash && type && ["email", "signup", "recovery"].includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    success = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    success = !error;
  }
  const response = NextResponse.redirect(new URL(success ? next : "/auth/error", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
