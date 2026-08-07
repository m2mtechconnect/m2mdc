# Verification Gates
1. Guard returns ALLOWED for aura-dc-security-test before any DB/Auth/Storage/Edge test.
2. Authenticated cross-tenant probe returns zero rows for every tenant_owned resource.
3. Authenticated UPDATE cannot change any ownership or tenant column on any table.
4. Anonymous probe can only INSERT into onboarding_submissions.
5. Edge Function inventory reconciles to zero orphans.
6. Two consecutive full test runs produce identical, non-increasing failure identities.
7. Production build contains no credential-shaped strings.
8. Every displayed metric resolves to LIVE, REPLAYED, SIMULATED or STATIC - never UNKNOWN.
