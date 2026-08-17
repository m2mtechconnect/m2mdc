# Deferred backlog (P3, explicitly out of this phase)

| Item | Note |
| --- | --- |
| Republish the application | Closes the only `BLOCKED_UNVERIFIED` runtime item; the published host is behind the current build |
| Missing `/landing/hero-datacenter.mp4` on the published host | Cosmetic; hero video 404s on every landing render |
| Delete `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Owner declined in this phase; referenced by zero lines of code |
| Retire `rag_tokens` | Still written by `rag-oauth-microsoft`, `rag-s3-connect`, `rag-db-connect`; needs those paths migrated first |
| Runtime verification of the Microsoft and S3 RAG connectors | Currently "configured but not runtime verified" |
| Large-scale ESLint cleanup | |
| Removal of remaining `any` types | |
| `AuthenticatedShell` route splitting | |
| Repository-wide markdown archival | |
| General UI redesign | |
| New connector implementation / Google Drive integration | |
| Cosmetic alignment of 36px and 40px controls | |
| Replacement of `window.confirm` | Not blocking a test and not a security problem |
| `SECURITY DEFINER` execute-grant review | Linter flags several functions callable by signed-in users; each needs an intentionality decision |
