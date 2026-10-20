import { audit, HttpFailure, readBody, requireSuperAdmin, roles, serveAdmin, validatePassword } from "../_shared/admin.ts";

serveAdmin(async request => {
  const { userClient, admin, actorId } = await requireSuperAdmin(request);
  const body = await readBody(request);
  if (typeof body.name !== "string" || !body.name.trim() || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || typeof body.role !== "string" || !roles.has(body.role) || !validatePassword(body.password)) throw new HttpFailure(400, "Name, email, a valid role, and a password with at least 8 characters, a letter and a digit are required.");
  // Trusted super-admin provisioning: new accounts are email-confirmed and can log in immediately.
  const { data, error } = await admin.auth.admin.createUser({ email: body.email.trim(), password: body.password, email_confirm: true, user_metadata: { name: body.name.trim() } });
  if (error) throw new HttpFailure(/already|exists|registered/i.test(error.message) ? 409 : 422, error.message);
  const id = data.user.id;
  if (body.role !== "member") {
    // Use the caller's JWT and the safe, audited RPC. Do not use the service-only
    // helper mentioned in the walkthrough that lacks last-super-admin protection.
    const { error: roleError } = await userClient.rpc("set_user_role", { p_user_id: id, p_role: body.role });
    if (roleError) throw new HttpFailure(502, "The account was created as a member, but role assignment failed. Retry the role change for this user ID.", { created_user_id: id });
  }
  try { await audit(admin, actorId, "create_user", id, { role: body.role }); }
  catch { throw new HttpFailure(502, "The account was created, but its audit entry failed. Review the user before retrying.", { created_user_id: id }); }
  const { data: profile, error: profileError } = await userClient.from("profiles").select("id,name,email,role,created_at,updated_at").eq("id", id).single();
  if (profileError) throw new HttpFailure(502, "The account was created, but reading its profile failed.", { created_user_id: id });
  return { status: 201, body: profile };
});
