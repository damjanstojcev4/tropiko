# App integration status — 2026-10-18

## Implemented

- Login and profile verification for admin and super_admin, session restoration, local logout, and revalidation when returning to the tab.
- Public member registration and signup password validation.
- Recovery email request, one-time magic link exchange, password update, and authenticated own-password changes.
- User listing, server search/role filters, and documented previous/next pagination links.
- Super admin account creation through signup followed by role promotion; retries preserve the created member ID.
- Confirmed role changes, immediate self-role refresh, and recovery email assistance for selected users.
- Authenticated admin inventory reads; product image upload, creation, editing, availability, sale prices, image removal, and deletion remain connected.

## Required setup / backend corrections

1. **Role and upload backend corrections:** the owner assigned `super_admin`, but Xano rejected an upload with `Required: admin, Actual: super_admin`. The owner then changed back to admin and received `ERROR_FATAL: Unable to locate input: file.size`. Correct the shared role hierarchy and process the File Resource through Get File Resource Data before reading its size/MIME. See [the Xano correction steps](../docs/xano-upload-fix.md). These edits require Xano workspace access and have not been applied from this repository.
2. **User listing response:** authenticated `GET /admin/users?page=1&per_page=20` returns `[]`, although `/auth/me` resolves user ID 1. A request filtered to `super_admin` also returns `[]`. The documented response is paginated. Inspect query filters/defaults, response mapping, and whether the endpoint version is published. The frontend accepts raw arrays, warns about completeness, and does not invent next-page links.
3. **Recovery email destination:** configure Xano's email template with the deployed frontend origin and `/admin/reset-password?magic_token=<token>&email=<encoded-email>`. Email delivery and the full live reset flow remain unconfirmed.
4. **Production configuration:** set `NEXT_PUBLIC_SITE_URL` to the real public HTTPS domain and allow that origin in Xano CORS settings. No deployment domain has been supplied.
5. **Content:** supply the shop address, phone number, and opening hours. These remain placeholders. The live inventory first-page read was empty; real products still need adding.

## API capabilities still absent

- Directly setting another user's password: only an own-password endpoint exists. The app provides recovery email assistance instead.
- Token revocation / logout endpoint: logout discards this tab's token. Global logout and revoking other sessions are not available through the documented API.
- Dedicated admin invite or atomic create-and-promote endpoint: account creation currently requires two requests, so a failed promotion can leave a member account. The form supports retrying promotion without re-registering.

## Evidence and limits

TypeScript compilation and ESLint pass without warnings. Live login, current profile, user listing, and admin inventory were inspected. The profile is admin, so super admin writes could not be verified live. No user roles, products, or passwords were changed during this update, and no recovery email was sent. No new automated/browser tests were run. Existing product browser-test mocks and reports predate this update.
