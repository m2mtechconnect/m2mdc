# Enterprise QA organization seed

This seed creates one isolated tenant for end-to-end authorization and feature testing. It follows the AURA DSX truth contract: every generated facility and scenario is labelled `SIMULATED_TEST_DATA`; DSX Exchange, NVIDIA runtime and SimReady validation remain explicitly unavailable.

## Required inputs

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side execution only)
- `AURA_ALLOW_QA_SEED=1`
- `AURA_ALLOW_MANAGED_QA_SEED=1` when deliberately targeting a managed Supabase project
- `AURA_QA_PERSONA_USERS_JSON`: JSON object mapping fixture persona keys to existing Supabase Auth user UUIDs

Example shape (use real existing UUIDs; do not commit them):

```json
{
  "owner": "<existing-user-uuid>",
  "admin": "<existing-user-uuid>",
  "executive": "<existing-user-uuid>",
  "manager": "<existing-user-uuid>",
  "engineer": "<existing-user-uuid>",
  "operator": "<existing-user-uuid>",
  "compliance": "<existing-user-uuid>",
  "analyst": "<existing-user-uuid>",
  "viewer": "<existing-user-uuid>"
}
```

Run `bun run db:seed:enterprise-qa`. The command is idempotent and reads back the organization, memberships and facilities before reporting success.

The seeder does not create accounts, set passwords, send invitations, weaken RLS or write browser-local tenant state. Authentication users must be created through the approved account lifecycle first. Organization switching continues through `set_active_org`.

## Scope

The initial seed creates:

- AURA Enterprise QA Lab;
- owner plus optional persona memberships;
- Montreal sovereign AI-factory and Toronto disaster-recovery facilities;
- relevant simulated cooling, utility and capacity scenarios;
- accepted, stale, missing, rejected and conflicting telemetry classifications;
- explicit negative states for DSX Exchange, NVIDIA runtime and SimReady validation.

External connectors remain disabled or simulated. Real messages, paid workloads and live operational claims are outside this fixture.

## Owner bootstrap

The companion migration `20260826224000_bootstrap_initial_platform_owner.sql` resolves the initial platform-owner deadlock without exposing owner elevation to ordinary administrators. It runs only when no unexpired global owner exists, requires exactly one confirmed and non-deleted Auth record for the configured administrator, and writes `platform_owner_bootstrapped` to `audit_logs` in the same transaction.

After the migration is applied, sign out and sign back in before provisioning the QA organization. Verify the global owner grant and audit event before running the seed. Reapplying the migration after an owner exists is a no-op.
