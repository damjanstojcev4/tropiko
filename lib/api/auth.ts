import { createClient } from "@supabase/supabase-js";
import { ApiError, databaseError } from "./client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";
import type { LoginCredentials, SignupCredentials } from "@/types/auth";

function createRegistrationClient() {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, { auth: { storageKey: "banana-makovo-signup", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
let registrationClient: ReturnType<typeof createRegistrationClient> | undefined;
export const authApi = {
  session: async () => {
    const { data, error } = await createSupabaseBrowserClient().auth.getSession();
    if (error) throw databaseError(error);
    return data.session;
  },
  signup: async ({ name, email, password }: SignupCredentials) => {
    // Keep a public signup from replacing an already signed-in administrator.
    const isolated = registrationClient ??= createRegistrationClient();
    const { data, error } = await isolated.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/auth/confirm?next=/admin/login` } });
    if (error) throw databaseError(error);
    if (!data.user) throw new ApiError("Не може да се создаде профилот.", 500);
    return { user_id: data.user.id, requiresConfirmation: !data.session };
  },
  login: async (credentials: LoginCredentials) => {
    const { data, error } = await createSupabaseBrowserClient().auth.signInWithPassword(credentials);
    if (error) throw databaseError(error);
    if (!data.session) throw new ApiError("Серверот не врати валидна сесија.", 401);
    return data.session;
  },
  me: async (_token?: string, signal?: AbortSignal) => {
    const supabase = createSupabaseBrowserClient();
    const { data: identity, error: authError } = await supabase.auth.getUser();
    if (authError) throw databaseError(authError);
    if (!identity.user) throw new ApiError("Најавете се повторно.", 401);
    let query = supabase.from("profiles").select("id,name,email,role,created_at,updated_at").eq("id", identity.user.id);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.single();
    if (error) throw databaseError(error);
    return data;
  },
  requestPasswordReset: async (email: string) => {
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/account/update-password` });
    if (error) throw databaseError(error);
  },
  updatePassword: async (password: string, confirmPassword: string, _token?: string) => {
    void _token; // Supabase uses its refreshed cookie-backed session.
    if (password.length < 8 || password !== confirmPassword) throw new ApiError("Лозинките мора да се совпаѓаат и да содржат најмалку 8 знаци.", 400);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) throw databaseError(error);
  },
  updateMyName: async (name: string) => {
    const supabase = createSupabaseBrowserClient();
    const { data: identity, error: identityError } = await supabase.auth.getUser();
    if (identityError || !identity.user) throw new ApiError("Најавете се повторно.", 401);
    const { data, error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", identity.user.id).select().single();
    if (error) throw databaseError(error);
    return data;
  },
  logout: async () => {
    const { error } = await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    if (error) throw databaseError(error);
  },
};
