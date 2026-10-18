# Xano upload corrections

The frontend sends `multipart/form-data` with the selected binary file in field `file`. The browser supplies the multipart boundary. No client-supplied storage path, size field, or MIME field is required by the documented upload contract.

## Confirmed backend failures

1. A super admin upload returned `{ "statement": "Throw Error", "payload": "User does not have the required role to perform this action. Required: admin, Actual: super_admin" }` with HTTP 200.
2. After changing the account to admin, the owner reported `{ "code": "ERROR_FATAL", "message": "Unable to locate input: file.size" }`.

These responses show a role-enforcement problem followed by a file-input handling problem. Changing product image parsing alone cannot repair these backend failures.

## Correct the upload function stack

Edit `Products → POST /admin/uploads/product-image` in Xano:

1. Ensure the required input named `file` is a **single File Resource**, not an object requiring `size`, `mime`, or a storage `path` from the frontend.
2. Keep authenticated role enforcement, with `admin` as the minimum role and super admins included by the hierarchy below.
3. Add **Get File Resource Data** with the complete `file` input as its value. Save its output as `file_info`.
4. Validate the output variable's size (`file_info.size`) is greater than zero and no more than **5,242,880** bytes. Validate `file_info.mime` is `image/jpeg`, `image/png`, or `image/webp`. Replace references to `input.file.size` / `input.file.mime` with fields from this output variable. Use the variable picker to select the output, not the input.
5. Call **Create Image Metadata** with the original complete File Resource input. Save the resulting attachment as `image`.
6. Return `image` as the endpoint response, including its generated `path`. The product endpoint accepts that attachment as `image`; the owner should only choose a local file.
7. Publish the corrected endpoint in the active branch. Report invalid files with HTTP 400/422 and unauthorized/forbidden requests with HTTP 401/403. Do not catch failures and return them as a successful upload.

This sequence follows Xano's official guides:

- [Verifying Uploaded File Type](https://www.xano.com/learn/verifying-uploaded-file-type/) — Get File Resource Data provides file size and MIME metadata for validation.
- [Content Upload](https://www.xano.com/learn/content-upload-images-videos-audio-pdfs/) — File Resource input is mapped to Create Image Metadata, whose output becomes the saved attachment.

## Correct role enforcement

In the shared `Quick Start/enforce_role` function, include all three roles and compare their ranks. Required logic (pseudocode, not an importable XanoScript export):

```text
levels = { member: 1, admin: 2, super_admin: 3 }
actual_role = authenticated user's current database role
deny if actual_role or required_role is not in levels
deny if levels[actual_role] < levels[required_role]
otherwise allow
```

Use `required_role = admin` for product/image operations, and `required_role = super_admin` for role changes. The latter must continue rejecting ordinary admins. Keep public signup fixed to member. Do not remove role checks or rely on a client-supplied role. Publish the shared-function changes used by both API groups.

## Frontend handling

The API client now rejects Xano error envelopes even when their HTTP status is 200. Recognized file-metadata and contradictory role errors show a backend configuration message. They do not become missing-image-path errors, successful product saves, or unnecessary login redirects.

## Status

The Xano workspace implementation is not stored in this repository and no Xano management connection is available here. These backend edits have not been applied. File upload and product creation remain blocked until the endpoint is corrected. No roles, uploads, products, or passwords were changed while preparing this correction.
