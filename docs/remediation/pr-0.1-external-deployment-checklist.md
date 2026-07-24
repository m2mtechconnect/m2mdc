# PR-0.1 External Deployment & Credential-Rotation Checklist

Repository controls in this PR cannot prove that historical remote state
has been remediated. The following actions are the responsibility of the
deploying operator and must be recorded outside the repo before any
production release built from PR-0.1 code.

## Credential rotation (mandatory)

- [ ] Rotate the previous `LOVABLE_API_KEY` (assumed exposed — Vite inlined
      `VITE_LOVABLE_API_KEY` into browser bundles). Use
      `lovable_api_key--rotate_lovable_api_key`.
- [ ] Confirm the old key returns 401 from the AI gateway after rotation.
- [ ] Confirm no CI or edge-function secret store still holds the old value.

## Remote edge-function state

- [ ] Enumerate remotely deployed functions and compare against
      `docs/remediation/evidence/pr-0.1/route-allowlist.json`
      (`production_functions: []`).
- [ ] Undeploy every function not on the allowlist, including
      `green-dc-recommend` and `generate-ai-recommendations`.
- [ ] Verify `green-dc-recommend` returns 401/404 from the gateway (JWT
      verification is enabled and the function is undeployed).

## Omniverse endpoint

- [ ] Ensure no production deployment sets `VITE_OMNIVERSE_KIT_URL` to a
      plaintext HTTP endpoint or a raw IPv4 address.
- [ ] When a Kit integration is re-introduced, route through a validated,
      TLS, server-mediated endpoint as described in ADR 0008.

## Database

- [ ] Apply the PR-0.1 migration
      (`20260724120000_pr01_user_roles_lockdown.sql`) to the target
      environment via the standard Lovable Cloud approval flow.
- [ ] Verify `public.user_roles` shows only the `user_roles_read_own`
      policy and that `\dp public.user_roles` shows no
      INSERT/UPDATE/DELETE grants to `anon` or `authenticated`.
- [ ] Verify `public.admin_assign_role` and `public.admin_revoke_role`
      exist and require an approved-admin caller.

## CI

- [ ] Confirm `.github/workflows/production-perimeter.yml` runs on the
      target branch and blocks merges on failure.