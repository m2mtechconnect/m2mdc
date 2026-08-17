# Anonymous access results

All probes issued with the publishable anon key only.

| Target | Before | After |
| --- | --- | --- |
| `GET /rest/v1/agent_suggestions_cache?select=query` | 200, raw cached user query text | **401** `permission denied for table agent_suggestions_cache` |
| `POST /rest/v1/onboarding_submissions` | 201, unthrottled insert | **401** `permission denied for table onboarding_submissions` |
| `GET /rest/v1/rag_tokens` | policy-gated but granted | **401** `permission denied for table rag_tokens` |
| `GET /rest/v1/asset_canary_events` | no anon grant | 401 (unchanged) |
| `GET /rest/v1/connection_data_contracts` | no anon grant | 401 (unchanged) |
| `GET /functions/v1/rag-oauth-google?action=start` | 200 with a Google authorization URL | **410** `PARALLEL_OAUTH_DISABLED_PENDING_MANAGED_CONNECTOR` |
| `POST /functions/v1/public-intake` (valid contact) | n/a | 200 `{ok:true, correlation_id}` |
| `POST /functions/v1/public-intake` (invalid) | n/a | 400 `invalid_payload` |

No raw user query text, embedding, prompt or tenant identifier is reachable anonymously.
Anonymous route sweep: `/manage/connections` and `/admin/platform-readiness` both
redirect to `/`.
