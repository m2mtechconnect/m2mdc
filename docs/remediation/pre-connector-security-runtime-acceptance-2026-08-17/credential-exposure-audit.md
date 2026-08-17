# Credential exposure audit

## Client bundle scan

Scanned the full production build output (`dist/**/*.js`, `*.html`) for:

`lovack_*`, `sb_secret_*`, `service_role`, `GOOGLE_OAUTH_CLIENT*`,
`MSFT_CLIENT_SECRET`, `CONNECTION_CREDENTIAL_KEY`, `LOVABLE_API_KEY`,
`rag-oauth-google`

Result: **zero matches**.

The only credential in the bundle is the publishable anon key, which is designed
to ship to the browser and is protected by RLS.

## Browser storage

No connector credential, connection key or provider token is written to
`localStorage`, `sessionStorage` or a cookie. The only stored auth artefact is
the Supabase session for the signed-in user.

## Server-side handling

| Item | Handling |
| --- | --- |
| Connection credentials | AES-GCM encrypted at rest with `CONNECTION_CREDENTIAL_KEY`, decrypted only inside edge functions |
| Managed per-user handles (`app_user_connections`) | encrypted ciphertext column, service-role read only, client policy `USING (false)` |
| Google provider tokens | none exist; `rag_tokens` has 0 rows |
| `LOVABLE_API_KEY` | edge-function environment only |

## Error and log hygiene

Public intake responses return `{ error: <code>, correlation_id: <uuid> }` and
nothing else. Logs record the correlation id, intake kind and outcome. No
payload contents, no credentials, no SQL, no stack traces reach the client.

## Residual

`GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` remain in the secret
store, referenced by zero lines of code. Owner declined deletion in this phase.
No code path can read them; they are inert but present.

No secret value was printed, exported or inspected during this audit.
