# Parallel Google OAuth quarantine

Status: **PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR**

Migration identifier: `20260817201022_96b4f2cf-29b6-4b2e-8044-d62b095a59e1`

## What existed

`supabase/functions/rag-oauth-google` built its own Google authorization URL
(`action=start`) and performed its own authorization-code exchange
(`action=callback`), then inserted the raw token JSON into `public.rag_tokens`.
The column is named `token_encrypted` but the value written was a plain
`TextEncoder` encoding of the token payload - not encryption.

## What changed

1. Handler replaced with a fail-closed responder: every method and action returns
   HTTP 410 with `status: PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR`. No
   authorization URL is built, no code is exchanged, no token is persisted, and the
   function no longer reads the Google client secret at all.
2. Client call sites removed:
   - `src/components/rag/RAGPanel.tsx` - `handleGoogleDriveConnect` no longer calls
     the function; it reports that managed authorization is not enabled.
   - `src/components/rag/RAGUploadTabs.tsx` - `handleCloudConnect('google')` returns
     before any navigation. The Microsoft branch is unchanged.
3. Database quarantine: `rag_tokens` client policy replaced with
   `USING (false) WITH CHECK (false)`, and `anon`/`authenticated` grants revoked.
   Table comment records the quarantine.

## Runtime proof

```
GET  /functions/v1/rag-oauth-google?action=start            -> 410 PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR
GET  /functions/v1/rag-oauth-google?action=callback&code=.. -> 410 PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR
GET  /rest/v1/rag_tokens (anon)                             -> 401 permission denied for table rag_tokens
GET  /rest/v1/rag_tokens (authenticated engineer)           -> 403 permission denied for table rag_tokens
select count(*) from rag_tokens                             -> 0
```

No raw Google access or refresh token exists anywhere in the database.

## Invocation surface review

- `rg 'rag-oauth-google'` across `src/` returns no remaining call site.
- No cron job, database webhook, trigger or scheduled task references the function.
- The function is retained (rather than deleted) so the 410 is explicit for any
  bookmarked redirect URI or in-flight popup; deleting it would return a generic 404
  that is indistinguishable from a deployment error.

## Secrets

`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` are **not** removed in this
phase: they are still referenced by other Google-related server code paths and removing
them is a separate, reviewed change. The quarantined function no longer reads them, so
their presence grants no capability through this path.

## Migration path

Google user authorization must move to the managed App User Connector, which keeps the
provider tokens at the gateway and gives AURA only an opaque handle. Blocking owner
action (carried from the previous phase): link a Google Drive App User Connector client.
