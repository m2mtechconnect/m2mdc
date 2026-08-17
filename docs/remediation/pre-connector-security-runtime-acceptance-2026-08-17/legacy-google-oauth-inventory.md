# Legacy parallel Google OAuth — retirement inventory

Target: `supabase/functions/rag-oauth-google`, which built its own Google
authorization URL, performed its own code exchange, and wrote the raw token
payload into `rag_tokens.token_encrypted` (a `TextEncoder` encoding, not
encryption). It was quarantined to a fail-closed `410` in the previous phase.

| Surface | Finding before removal |
| --- | --- |
| Client call sites | None. `RAGPanel.tsx` and `RAGUploadTabs.tsx` had already been reduced to inert "unavailable" toasts |
| Server call sites | None. No other edge function imported or invoked it |
| Routes | No browser route referenced it |
| Edge function | Deployed, returning `410` for every method and action |
| Scheduled jobs / webhooks / triggers | None reference it |
| Environment variables | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — no longer read by any code |
| Database table | `rag_tokens`, `0` rows, policy `USING (false)`, `anon`/`authenticated` grants revoked |
| Database functions / grants | No function or grant specific to this path |
| Generated types | `rag_tokens` present in `src/integrations/supabase/types.ts` (table still exists) |
| Tests | No test asserted the legacy behaviour |
| Documentation | `docs/remediation/audit-security-closure-2026-08-17/parallel-google-oauth-quarantine.md` |

## Preconditions verified

- Function returned `410` for `action=start` and `action=callback`.
- No active feature depends on it.
- `select count(*) from public.rag_tokens` -> `0`.
- No raw Google access or refresh token exists anywhere in the database.
- No scheduled process can invoke it.
- No approved connector uses its secrets.

No secret value was printed, copied, exported or inspected at any point.
