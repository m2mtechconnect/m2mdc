# Public intake abuse controls

Direct anonymous inserts into `onboarding_submissions` are revoked. The only public
write path is the `public-intake` edge function (`verify_jwt = false`, documented in
`supabase/config.toml`). It holds the service-role key server-side; no service-role
credential exists in client code.

| Control | Implementation | Proof |
| --- | --- | --- |
| Schema validation | Per-field type, trim, length and array-size checks; strict email pattern; unknown intake kind rejected | invalid contact payload -> 400 `invalid_payload` |
| Payload size limit | 16 000 byte cap read before JSON parse | 413 `payload_too_large` |
| Rate limiting | Hourly bucket per `user:<id>` or `ip:<addr>` per intake kind, in `public_intake_rate_limits`; 5 requests/hour | 6 sequential anonymous contact posts -> `200,200,200,429,429,429` (bucket already partly consumed by earlier probes) |
| Duplicate suppression | Same onboarding email within 1 hour is a no-op | second identical onboarding post -> `{"ok":true,"duplicate":true}` and no second row |
| Bot protection | `company_website` honeypot; a filled value returns 202 and writes nothing | honeypot post -> 200-class response, no row created |
| Safe error responses | Only `invalid_payload` / `rate_limited` / `intake_failed` / `payload_too_large` are returned; provider and database detail stays in server logs | all failure probes returned opaque codes |
| Audit correlation | `correlation_id` UUID returned to the caller and persisted on the record | present in every response and on both tables |
| Server-derived identity | User id comes from the bearer token via `auth.getUser`; any client-supplied user id is ignored. Records with no session are stored with `is_anonymous = true`, `intake_source = 'SERVER_INTAKE'` | contact record written by the anonymous probe had `is_anonymous = t` |

Authenticated in-app submissions from `Help.tsx` use the same function, so the identity
is always server-derived. The residual direct-insert policy on `contact_expert_logs`
requires `user_id = auth.uid() AND is_anonymous = false`; a spoofed user id is rejected
with an RLS violation.

All probe rows and rate-limit buckets created during verification were deleted.
