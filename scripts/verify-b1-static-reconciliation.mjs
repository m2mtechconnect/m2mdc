#!/usr/bin/env node
// PR-0.1 Checkpoint B7.5 - Static reconciliation of B1 corrective migration.
// Read-only. No DB contact.
import fs from "node:fs";
import path from "node:path";

const MIG_DIR = "supabase/migrations";
const files = fs.readdirSync(MIG_DIR).filter(f => f.endsWith(".sql")).sort();
const B1 = files[files.length - 1];
const B1_PATH = path.join(MIG_DIR, B1);
const b1 = fs.readFileSync(B1_PATH, "utf8");

const checks = [];
const check = (name, ok, detail="") => checks.push({name, ok, detail});

// 1. B1 is the last migration in lex order
check("b1_is_last_migration", B1 === "20260724005954_e17e6492-dc51-46f8-bb87-642071501b8b.sql",
      `last=${B1}`);

// 2. B1 drops the three self-manage policies
for (const pol of ["user_roles_insert_own","user_roles_update_own","user_roles_delete_own"]) {
  check(`b1_drops_${pol}`,
    new RegExp(`DROP POLICY IF EXISTS "${pol}" ON public\\.user_roles`).test(b1));
}

// 3. B1 revokes DML from anon+authenticated on user_roles
check("b1_revokes_dml_user_roles",
  /REVOKE\s+INSERT,\s*UPDATE,\s*DELETE\s+ON\s+public\.user_roles\s+FROM\s+anon,\s*authenticated/i.test(b1));

// 4. B1 grants SELECT to authenticated only, ALL to service_role
check("b1_grant_select_authenticated",
  /GRANT\s+SELECT\s+ON\s+public\.user_roles\s+TO\s+authenticated/i.test(b1));
check("b1_grant_all_service_role",
  /GRANT\s+ALL\s+ON\s+public\.user_roles\s+TO\s+service_role/i.test(b1));

// 5. admin_assign_role + admin_revoke_role created, SECURITY DEFINER, safe search_path
for (const fn of ["admin_assign_role","admin_revoke_role"]) {
  const created = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}`).test(b1);
  const sec_def = new RegExp(`${fn}[\\s\\S]{0,600}SECURITY DEFINER`).test(b1);
  const search_path = new RegExp(`${fn}[\\s\\S]{0,600}SET search_path\\s*=\\s*public`).test(b1);
  const has_role_check = new RegExp(`${fn}[\\s\\S]{0,1500}has_role\\(_actor,\\s*'security_admin'`).test(b1);
  const approved_check = new RegExp(`${fn}[\\s\\S]{0,1500}is_approved_user\\(_actor\\)`).test(b1);
  check(`${fn}_created`, created);
  check(`${fn}_security_definer`, sec_def);
  check(`${fn}_safe_search_path`, search_path);
  check(`${fn}_requires_security_admin`, has_role_check);
  check(`${fn}_requires_approved`, approved_check);
}

// 6. role_change_audit created before admin_* functions inside B1
const posAudit = b1.indexOf("CREATE TABLE IF NOT EXISTS public.role_change_audit");
const posAssign = b1.indexOf("CREATE OR REPLACE FUNCTION public.admin_assign_role");
check("role_change_audit_created_before_admin_fns", posAudit > 0 && posAudit < posAssign,
      `audit_pos=${posAudit}, assign_pos=${posAssign}`);

// 7. is_approved_user relies on public.profiles (must exist prior)
check("is_approved_user_uses_profiles",
  /is_approved_user[\s\S]{0,400}FROM public\.profiles/.test(b1));

// 8. NO LATER MIGRATION exists that reintroduces self-manage policies.
// Since B1 is the last file (checks[0]), by construction there are no later files. Still validate no later grant/policy resurrects the escalation.
const laterFiles = files.slice(files.indexOf(B1)+1);
check("no_later_migrations_exist", laterFiles.length === 0, `later=${laterFiles.length}`);

// 9. Scan every prior migration to confirm no file after 20251211234933 (P0 introducer) reintroduces the escalation before B1 - only B1 removes it.
const P0 = "20251211234933_b6d2e072-6b68-461f-b36d-dfed0429f21d.sql";
const between = files.slice(files.indexOf(P0)+1, files.indexOf(B1)+1);
let reintroduce = false;
for (const f of between.slice(0,-1)) {
  const s = fs.readFileSync(path.join(MIG_DIR,f),"utf8");
  if (/CREATE POLICY[^;]*user_roles_(insert|update|delete)_own/i.test(s)) reintroduce = true;
  if (/GRANT\s+(INSERT|UPDATE|DELETE)[^;]*user_roles[^;]*TO\s+(anon|authenticated)/i.test(s)) reintroduce = true;
}
check("no_regression_between_p0_and_b1", !reintroduce);

// 10. B1 policy user_roles_read_own is scoped auth.uid()=user_id
check("read_policy_scoped_to_owner",
  /CREATE POLICY "user_roles_read_own"[\s\S]{0,300}USING \(auth\.uid\(\) = user_id\)/.test(b1));

// 11. REVOKE ALL on admin_* functions FROM PUBLIC + explicit GRANT EXECUTE authenticated
for (const fn of ["admin_assign_role","admin_revoke_role"]) {
  check(`${fn}_revoke_public`,
    new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(uuid, public\\.app_role, text\\) FROM PUBLIC`).test(b1));
  check(`${fn}_grant_authenticated`,
    new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\(uuid, public\\.app_role, text\\) TO authenticated`).test(b1));
}

const pass = checks.every(c => c.ok);
console.log(JSON.stringify({b1_file: B1, pass, total: checks.length, failing: checks.filter(c=>!c.ok).length, checks}, null, 2));
process.exit(pass ? 0 : 1);
