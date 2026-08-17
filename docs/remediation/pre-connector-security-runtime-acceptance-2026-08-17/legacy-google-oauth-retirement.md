# Legacy parallel Google OAuth — retirement record

Verdict: **retired**. The path is gone, not merely quarantined.

## Actions taken

| Action | Result |
| --- | --- |
| Removed the Google Drive authorization button and handler from `src/components/rag/RAGPanel.tsx` | done |
| Removed the Google Drive authorization button and `google` branch from `src/components/rag/RAGUploadTabs.tsx`, and dropped `GOOGLE_OAUTH_*` from its secret map | done |
| Deleted the `rag-oauth-google` edge function through the supported deployment process | done |
| Removed `supabase/functions/rag-oauth-google/` from the repository | done |
| Added regression test `tests/unit/legacyGoogleOAuthRetired.test.ts` | 4 tests, passing |
| Removed obsolete tests | none existed |

## Runtime proof after removal

```
GET /functions/v1/rag-oauth-google?action=start   -> 404   (function no longer deployed)
select count(*) from public.rag_tokens            -> 0
rg 'rag-oauth-google'      across src/ supabase/ tests/ scripts/ services/ -> no match
rg 'GOOGLE_OAUTH_CLIENT_(ID|SECRET)' across the repo (excluding docs) -> no match
rg 'Connect Google Drive' across src/ -> no match
```

The regression test asserts each of those four conditions so the path cannot be
reintroduced silently.

## Deliberately not done

- **`rag_tokens` was not dropped.** It is still written by
  `rag-oauth-microsoft`, `rag-s3-connect` and `rag-db-connect`. Dropping it
  would break three live features. It remains empty, client-locked
  (`USING (false)`, no `anon`/`authenticated` grants) and holds zero Google
  tokens. Retiring it is a separate, reviewed change tracked in
  `deferred-backlog.md`.
- **`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` were not deleted.**
  Removal was proposed and the project owner declined it in this phase. They are
  now referenced by zero lines of code, so they grant no capability through any
  code path, but they still exist in the secret store. Recorded as an accepted
  residual, not as a completed removal.

## Future connector work

Any future Google authorization must use the generic managed connector
architecture (`docs/` managed-connector material), which keeps provider tokens
at the gateway and gives AURA only an opaque per-user handle. The legacy flow
must not be reactivated, repaired or replaced.
