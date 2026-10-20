import { audit, HttpFailure, readBody, requireSuperAdmin, serveAdmin, validatePassword, validateUuid } from "../_shared/admin.ts";

serveAdmin(async request => {
  const { admin, actorId } = await requireSuperAdmin(request);
  const body = await readBody(request);
  if (!validateUuid(body.userId)) throw new HttpFailure(400, "A valid user UUID is required.");
  if (!validatePassword(body.newPassword)) throw new HttpFailure(422, "The password must contain at least 8 characters, a letter and a digit.");
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.userId);
  if (targetError || !target.user) throw new HttpFailure(404, "User not found.");
  await audit(admin, actorId, "reset_password_attempt", body.userId);
  const { error } = await admin.auth.admin.updateUserById(body.userId, { password: body.newPassword });
  if (error) throw new HttpFailure(422, error.message);
  try { await audit(admin, actorId, "reset_password", body.userId); }
  catch { throw new HttpFailure(502, "The password was changed, but recording the completion failed. Do not assume the change was rolled back.", { operation_applied: true }); }
  // No claim is made that all of the target user's existing sessions are revoked.
  return { body: { ok: true } };
});
