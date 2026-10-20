# Supabase migration status — 2026-10-20

## Implemented in this checkout

- Configured the supplied project URL/publishable key in ignored `.env.local` and installed `@supabase/supabase-js` / `@supabase/ssr`.
- Replaced active Xano requests with native Supabase Auth, profiles/products/audit-log queries, role RPCs, and Storage operations. The frontend does not call Xano endpoints or send its old tokens.
- Cookie-aware browser/server clients; Next.js 15 session-refresh middleware; verified Auth identity plus current database role; admin and super-admin product access; member denial.
- Signup without role metadata or replacement of an existing admin session, login, browser-session logout, recovery email, token-hash/PKCE callback, own-password update, and profile-name API.
- UUID account/product identifiers, filtered profile listing with exact-count pagination, safe role changes through `set_user_role`, and super-admin audit-log viewing.
- Product CRUD, stable range pagination, availability, prices/sales, and correct clearing of sale_price when a sale is disabled.
- Product-first photo workflow: reserve generated product-folder key, upload real File, attach with RPC, generate public display URL. No URL/path input. Retry retains the created product UUID and uploaded object. Previous image references survive failed replacements.
- Clear-image RPC and retired/orphan cleanup hints. No unsafe direct Storage deletions or cleanup RPC guesses.
- Source for the documented `admin-create-user` and `admin-reset-user-password` Edge Functions, plus UI calls and deployment configuration. Functions verify user JWT, email confirmation and current super-admin role before using a server-only secret key. Account role assignment uses the existing safe role RPC, not the helper described as unsafe in the walkthrough.

## Validation evidence

- Production `npm run build` passed, including Next.js compilation, lint, type checking and route generation.
- Standalone TypeScript and ESLint passed.
- Public read against `vfggluhxkjpthsuohfop` succeeded using the supplied publishable key. The products read was empty.
- OpenAPI discovery requires a secret key in this project, so full generated database types/RPC definitions could not be retrieved using public credentials. `types/database.ts` is explicitly a walkthrough-derived client contract.
- No authenticated products, photos, roles, passwords or Auth accounts were written during migration. No email was sent. No new automated/browser tests were run.
- Edge Function TypeScript was checked separately using the installed SDK and a minimal Deno API declaration. Functions were not executed, deployed or checked by a running Deno runtime.

## Required before claiming the whole workflow is live

1. **Supabase account:** create/verify the actual owner in Supabase Auth and assign super_admin through the documented operator bootstrap. Xano sessions/passwords do not transfer automatically.
2. **Email configuration:** allow the callback/recovery frontend URLs, configure token-hash signup/recovery email templates and production SMTP. `/auth/confirm` and `/account/update-password` are implemented locally.
3. **Edge Function deployment:** publish the included functions, configure the actual key-map labels and allowed frontend origins. Source is provided; deployment has not happened. Admin creation/direct target-password updates show service errors until this is completed.
4. **Cleanup contract/worker:** supply exact SQL definitions for cleanup/claim/finalization RPCs and their return shapes. The guide gives no signatures or deployed cleanup worker. Local path hints are not durable cleanup. Storage objects may remain after replacement/deletion until a protected cleanup operation is implemented.
5. **Schema reconciliation:** provide generated types or the SQL definitions. Reserve/attach and role arguments follow the explicit walkthrough. `clear_product_image(p_product_id)` follows its naming convention but was not given an exact signature. Reconcile this and all RPCs with the actual export.
6. **Runtime verification:** exercise real admin/super-admin logins, reserve/upload/attach/clear operations, recovery email delivery, role changes, and account-management functions after setup. Current build success does not establish backend policy correctness.
7. **Production/business details:** configure the public HTTPS domain and supply shop contact details if their placeholders are still in use.

See the root README for setup, callback templates, owner bootstrap, Edge Function deployment, and remaining image-cleanup requirements. Historical Xano diagnostics are retained only as prior migration context.
