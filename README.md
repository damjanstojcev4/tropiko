# Banana Makovo

Responsive Macedonian produce catalog and admin panel built with Next.js App Router, strict TypeScript, Tailwind CSS, and the documented Xano API.

## Run locally

```sh
npm install
npm run dev
```

Open `/` for the storefront and `/admin/login` to sign in. Development assets use `.next-dev`; production builds use `.next`, so a production build cannot overwrite files used by the running dev server.

## API configuration

These are public endpoint URLs, with defaults matching the provided Xano instance. Override them in `.env.local` if needed:

```dotenv
NEXT_PUBLIC_XANO_API_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:B2FDnMho
NEXT_PUBLIC_XANO_AUTH_API_BASE_URL=https://x8ki-letl-twmt.n7.xano.io/api:EOaIUs6k
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use the actual public HTTPS address for `NEXT_PUBLIC_SITE_URL` before deployment. No administrator credentials are stored in environment variables or source code.

## Authentication

Sign in with an existing Xano account whose `/auth/me` response has `role: "admin"` or `"super_admin"`. The frontend calls the documented `/auth/login`, verifies `/auth/me`, and retains the bearer token in this tab's `sessionStorage`. Passwords are not stored. Admin routes check the session, and Xano authorizes all upload and product-write requests. A rejected/expired bearer session returns the owner to login. Returning focus to the tab refreshes the profile so external role changes are reflected.

The supplied contract does not define a token-revocation/logout endpoint. Logout clears this browser session; it does not call an invented backend endpoint or revoke previously issued tokens.

### Password recovery and changes

- `/admin/forgot-password` requests an email using `GET /reset/request-reset-link?email=...`.
- Configure the Xano email template to link to `<frontend-origin>/admin/reset-password?magic_token=<token>&email=<encoded-email>`. Use `http://localhost:3000` for local development and the real HTTPS frontend origin in production. This template is configured in Xano, not by the frontend request.
- The reset page removes the token and email from the address bar, then exchanges the one-time link only when the user clicks Continue. The returned bearer token stays in component memory and is used only to update the password. Reloading after exchange requires a new email link; no automatic admin session is granted.
- `/admin/security` lets an authenticated admin update their own password using the existing bearer session. On success the local session is cleared and the user signs in again. This does not imply server-side revocation of other sessions.
- Both password forms enforce the documented minimum of eight characters and matching confirmation. Passwords are never added to source, configuration, or browser storage.

### Accounts and roles

- `/admin/register` calls public `/auth/signup`, with name, email, and password only. The password must have at least eight characters, a letter, and a digit. Signup creates a `member` and does not grant admin access or replace the current admin session.
- `/admin/users` loads `GET /admin/users` from the authentication API group. Both admins and super admins can inspect users, search by name/email, filter roles, and navigate the documented pagination links.
- Super admins see role editing, account creation, and password recovery controls. Role updates use `PATCH /admin/users/{id}/role`. Changes require confirmation; failed updates retain the previous displayed role. The backend remains responsible for role enforcement and protecting the last super admin. Changing your own role refreshes `/auth/me` immediately.
- Creating an admin is a two-step operation: public signup creates a member, then the super admin's existing token promotes that returned user ID. The signup token is never stored. If promotion fails, the form retains the new member ID so retrying only attempts promotion. Closing that form leaves the created member in Xano; it does not delete it.
- Password assistance sends the selected user a recovery email through `/reset/request-reset-link`. No endpoint for directly setting another user's password is documented. `/reset/update_password` always changes the bearer token owner's password.
- The first `super_admin` must be assigned by the Xano workspace owner in the user table. An existing member/admin token cannot bootstrap its own privilege elevation through the documented role endpoint. There is no email-based privilege override.

**Live response discrepancy (2026-10-18):** `/admin/users` currently returns a raw empty array instead of the documented pagination object, while `/auth/me` resolves an existing admin. The client accepts either response format, but cannot infer missing users or next-page links from an array. The UI warns that completeness is unconfirmed. Check the Xano query, optional-filter defaults, response mapping, and published endpoint version; return the documented `items`, `curPage`, `nextPage`, and `prevPage` envelope.

## Product images and changes

The add/edit form accepts files from the administrator's device, with a local preview. It accepts JPEG, PNG, or WebP up to 5,242,880 bytes (5 MB).

1. On save, a selected file is posted to `/admin/uploads/product-image` as multipart form data under the `file` field. The browser supplies the multipart boundary; the client does not manually set that Content-Type.
2. The native Xano attachment is extracted from the upload response (direct or nested) using its nonempty `path` and `name` fields. Optional differences in `mime`/`type` no longer reject an otherwise identifiable attachment; returned metadata is preserved as supplied. A response must contain exactly one distinct attachment. The client never fabricates a storage path from a preview/public URL. It validates a nonempty `image.path` before including the attachment in the JSON product create/PATCH request; missing/ambiguous attachment data prevents the product write. Upload failures display a diagnostic panel with field names, value types, and empty-string indicators only. It does not display file contents, token values, or personal field values. A product-save rejection of `image.path` also records the shape of the image sent to distinguish upload-response problems from backend product-input problems.
3. The UI returns to the list only after the product request succeeds. If saving fails after upload, retrying the same form reuses that uploaded attachment.

Editing without changing the photo omits the image fields and preserves the existing image. Replacing it uploads a new file. Removing it sends `remove_image: true` on save, following the documented backend storage lifecycle. An image is optional, as allowed by the contract; products without an image render a neutral placeholder.

Availability uses `PATCH /admin/products/{id}` with only `is_available`. Deletion requires confirmation and removes the row only after a successful backend response. Failed changes preserve the previous product state.

## Catalog data and schema mapping

- Public catalog loads `/products`. Admin dashboard and product lists use authenticated `/admin/products`; editing loads authenticated `/admin/products/{id}` (documented in the preceding admin API walkthrough). Product lists accept either a direct array or the documented pagination envelope. Paginated responses follow `nextPage` until all pages have been read, including unavailable items. Direct arrays are consumed once because no continuation metadata is available; a backend that limits the returned rows must provide the pagination envelope for full inventory retrieval. Admin availability queries map to `is_available`, while public queries use `available`.
- The mapper translates `kg`, `piece`, and `package` into Macedonian display units and handles `is_on_sale`, `sale_price`, `sort_order`, and Xano image attachments.
- New products use the free-form category values `fruit` or `vegetable`. Existing `Fruits`, `Vegetables`, Macedonian labels, and names containing these category words are recognized. Unrecognized categories remain visible under all products and the admin's other-category filter. Editing an existing product without changing its category preserves its exact API value.
- The storefront refreshes on focus and after catalog changes via a browser event/BroadcastChannel. The HTTP client uses `no-store` and aborts obsolete requests.
- Production UI no longer reads the old browser-only product store or imports development fixtures. An empty/error API response is displayed honestly; it does not fall back to example products. Historical files under `lib/data/` are inactive visual-development references.

## Validation

```sh
npm run lint
npm run build
```

The browser integration checks use Playwright, resolved from a local installation or the bundled Codex runtime, and Chrome at its standard Windows path (`CHROME_PATH` can override it). Start a production server with `npm run start -- --port 3100`, then run:

```sh
node scripts/verify-xano.cjs http://localhost:3100
```

The existing script covers the previous product integration using intercepted responses. Its report predates the latest user-management changes and its route mocks need updating for authenticated admin inventory reads before reuse. It does not cover the new registration, role management, or recovery screens. No new automated tests were run for these screens. TypeScript compilation was checked with `node node_modules/typescript/bin/tsc --noEmit`. Live login, `/auth/me`, user listing, and inventory reads were inspected; no live role, product, or password changes were made during this update.

## Branding and business information

The supplied logo, icons, social-sharing image, and manifest are local assets. Business address, phone, and hours remain configurable placeholders in `lib/content.ts` until confirmed information is provided.
