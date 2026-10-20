# Banana Makovo

Mobile-first Macedonian produce catalog and admin panel built with Next.js 15, React, TypeScript, Supabase Auth, PostgREST, and Supabase Storage. The active application no longer calls Xano.

## Local setup

```sh
npm install
npm run dev
```

The supplied project URL and publishable key are configured in the ignored `.env.local`. `.env.example` documents the configuration for another checkout:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://vfggluhxkjpthsuohfop.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart the dev server after changing environment variables. Before deployment, change `NEXT_PUBLIC_SITE_URL` to the real HTTPS frontend origin. No secret/service-role key belongs in frontend configuration.

Development output uses `.next-dev`; production builds use `.next`, preserving the existing protection against builds overwriting an active dev server's assets.

## Authentication and roles

- Open `/admin/login` and use a **Supabase Auth** account. Existing Xano credentials/sessions are not migrated automatically.
- `/admin/register` performs native public member signup and never submits a role. Signup uses a separate nonpersistent Auth client so it cannot replace an administrator's session.
- The browser uses `@supabase/ssr` cookie-backed sessions. Next.js 15 `middleware.ts` refreshes protected-area sessions. Server callbacks use a separate cookie-aware, user-scoped client.
- The admin provider verifies the Auth user and reads the current `profiles` row. Both `admin` and `super_admin` can manage products; members cannot enter the admin panel. RLS and database RPCs remain authoritative.
- Auth events and tab focus refresh the displayed identity/role. Logout signs out this browser session through Supabase rather than just discarding a custom token. Existing legacy browser tokens are discarded.
- `/admin/users` reads `profiles`, with stable pagination, exact count, role filtering and escaped name/email search. Role changes call `set_user_role(p_user_id, p_role)` and immediately refresh the caller's own profile when applicable.
- `/admin/audit` reads the documented `audit_logs` fields for super admins. It never writes audit records from the browser.

### Initial owner account

Create and verify the owner's account in Supabase Auth using the dashboard or `/admin/register`. Obtain its real Auth UUID. A project operator can then run:

```sql
update public.profiles
set role = 'super_admin'
where id = '<EXISTING_AUTH_USER_UUID>'::uuid
returning id, email, role;
```

Confirm exactly one row is returned. This is a manual operator bootstrap, not a public app endpoint. No initial password is embedded in the repository.

## Email confirmation and recovery

The app implements `/auth/confirm` for token-hash confirmation and PKCE authorization-code exchange. It writes Auth cookies, removes token parameters through a redirect, accepts only the supported flow types, and permits only fixed local redirect destinations. Invalid links go to `/auth/error`.

Allow these URLs in Supabase Auth URL Configuration for localhost and the real production origin:

- `/auth/confirm`
- `/auth/confirm?next=/admin/login`
- `/auth/confirm?next=/account/update-password`
- `/account/update-password`

Set the Site URL and SMTP/sender settings in Supabase. For token-hash templates, the application's signup and recovery calls supply `RedirectTo` with the callback route and its fixed `next` parameter. Example email links:

```html
<!-- Confirm signup -->
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Потврди профил</a>
<!-- Reset password -->
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Промени лозинка</a>
```

These examples depend on `RedirectTo` retaining the supplied `?next=...` query. Verify the rendered email link in your project before use. A fixed SiteURL-based callback with a token hash is another supported configuration. Configure signup token-hash links explicitly because public signup intentionally does not persist the isolated client's session/code verifier. Default PKCE recovery links work in the requesting browser; token-hash recovery also supports opening the email on another device.

`/admin/forgot-password` calls `resetPasswordForEmail`. `/account/update-password` and the legacy frontend URL `/admin/reset-password` use the established Supabase session and `updateUser({password})`; they do not exchange Xano magic tokens. `/admin/security` changes the current user's password. The configured Auth password policy may impose additional requirements beyond the form's minimum length.

The user-list recovery-email button invokes Supabase's public recovery API, which is not a server-authorized/audited super-admin operation. A dedicated protected email endpoint would be needed if that auditing boundary is required.

## Products and uploaded photographs

- Native `products` queries use UUID IDs, stable `sort_order/name/id` ordering, and bounded range reads. All pages are read for the existing catalog UI. Availability is only filtered when requested, so out-of-stock products remain visible.
- The mapper keeps the Macedonian UI units while sending `kg`, `piece`, and `package` to the database. Turning a sale off explicitly clears `sale_price` to satisfy the documented constraints.
- Product field writes **never include `image_path`**. Only the image RPCs control that column.
- Saving a new product first creates its metadata row. The form retains that UUID if the photo stage fails; retrying updates that same product rather than inserting a duplicate. Metadata can therefore be saved even if the photo fails, and the form reports this partial result.
- The file picker accepts JPEG/PNG/WebP up to 5,242,880 bytes. The app generates `products/<product UUID>/<random UUID>.<extension>`, calls `reserve_product_image(p_product_id, p_image_path)`, uploads the real File to `product-images` with `upsert:false`, then calls `attach_product_image(p_product_id, p_image_path)`.
- A successfully uploaded object is reused when retrying attachment. An already attached path is detected before reattaching. The previous image stays referenced until attachment succeeds.
- Removing an image uses `clear_product_image(p_product_id)`. This parameter name follows the walkthrough's product RPC convention; the guide did not include its full SQL definition, so verify it against the schema export.
- Display URLs come from `storage.from('product-images').getPublicUrl(image_path)`. Users do not enter a URL or path. Public image reads need no login; Storage policies must protect mutations.

### Cleanup gap requiring the actual RPC definitions

The walkthrough names reserve/attach/clear RPCs but does not provide the per-path cleanup RPC names, argument lists, result contracts, or a deployed worker. The frontend therefore **does not guess cleanup operations or directly delete Storage metadata**.

Retired paths and orphan candidates are retained as public object-key hints in local storage under `banana-makovo-pending-image-cleanup`; the database's retirement/reservation records remain authoritative. Successful attachment removes the current image from the hint queue. These hints are not a durable cleanup worker and can be lost if browser storage is cleared. No automatic Storage deletion is claimed.

Provide the full cleanup RPC definitions and permission rules to finish a protected cleanup operation/worker. It must recheck references and atomically claim eligible paths before deleting through the Storage API; failed cleanup must remain discoverable for retry.

## Super-admin account functions: source included, not deployed

The guide explicitly states no Edge Functions are deployed. Complete local source is included for its proposed contracts:

- `supabase/functions/admin-create-user`: `{name,email,password,role}` → HTTP 201 profile. Verifies the caller's JWT, verified email, and current super-admin profile. Uses Auth Admin server-side, then the caller-scoped **safe `set_user_role` RPC**, avoiding the unsafe role-assignment helper mentioned in the guide. Returns a created UUID on partial failure so the UI retries role assignment rather than creating a second account.
- `supabase/functions/admin-reset-user-password`: `{userId,newPassword}` → `{ok:true}`. Verifies the same caller conditions, records an audit attempt, changes the target password through Auth Admin, and records completion. A completion-audit failure explicitly reports that the password was already changed. It makes no promise of revoking all existing sessions.

New super-admin-provisioned accounts are intentionally email-confirmed and can log in immediately. Public signup retains normal confirmation behavior. Passwords/tokens are never logged or returned. Auth creation, password changes, role changes, and audit writes are not one transaction; partial errors are reported rather than hidden.

Deployment instructions:

```sh
supabase login
supabase link --project-ref vfggluhxkjpthsuohfop
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy admin-create-user
supabase functions deploy admin-reset-user-password
```

Create the ignored `supabase/functions/.env` from its example. Set `BANANA_PUBLISHABLE_KEY_NAME` and `BANANA_SECRET_KEY_NAME` to the **actual key labels** in the platform-injected `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS` maps. Set `ALLOWED_ORIGINS` to localhost plus the real frontend HTTPS origin, comma-separated. No actual secret key value is checked into this project.

The function gateway setting disables its legacy JWT check because each handler independently verifies the user JWT with Supabase Auth before any privileged operation. An API key or a forged role body cannot authorize the handler. CORS is handled separately and is not the authorization boundary.

If the functions are not deployed/configured, the app displays an explicit service error. It does not fall back to public signup for creating admins. Function code has not been deployed or verified with privileged credentials during this migration.

## Types and validation

`types/database.ts` is a minimal **walkthrough-derived contract**, not an automatically generated schema export. The project's OpenAPI discovery endpoint requires a secret key, so its full definitions could not be retrieved using the supplied public credentials. Generate actual types with an authorized Supabase CLI account:

```sh
supabase gen types typescript --project-id vfggluhxkjpthsuohfop --schema public > types/database.generated.ts
```

Use that output to reconcile the contract and helper aliases, especially RPC signatures. Do not overwrite the current helper file without adapting its exported row aliases.

Static checks:

```sh
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Edge Functions run on Deno and are excluded from Next.js TypeScript compilation. Their TypeScript was checked separately against the installed SDK with a minimal Deno API declaration; this is not execution in the Deno runtime. The existing Xano browser-test script and historical reports have not been repurposed as Supabase verification. No new automated/browser tests were run for this migration. The supplied project/key successfully read the public products table; it was empty. Authenticated uploads, role changes, email delivery, and Edge Functions still require real Supabase accounts and deployment.

Historical Xano guides and reports remain for reference only. Current storefront assets and styling were preserved.
