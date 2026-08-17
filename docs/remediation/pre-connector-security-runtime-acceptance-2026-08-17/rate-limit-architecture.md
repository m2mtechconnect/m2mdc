# Public intake rate-limit architecture

## Surface

One edge function, `public-intake`, fronts every anonymous submission path:

- onboarding intake (`kind: "onboarding"` -> `onboarding_submissions`)
- contact-expert intake (`kind: "contact"` -> `contact_expert_logs`)

Direct anonymous INSERT on both tables is revoked, so the function is the only
write path. There is no other anonymous submission endpoint.

## Order of operations

1. Read `Content-Length` / body size. Over 16 KB -> `413 payload_too_large`
   before any parsing or database work.
2. Honeypot field present -> `202` with no insert (bots are not told they failed).
3. Identity derivation, server-side only:
   - Signed-in caller: `user:<sub>` taken from a verified JWT via
     `supabase.auth.getUser()`. A client-supplied user id in the body is ignored.
   - Anonymous caller: `ip:<addr>` from the edge runtime's `x-forwarded-for`.
   No other client header participates in the bucket key. There is no cookie,
   session id, or fingerprint input, so a caller cannot mint a fresh bucket.
4. Atomic quota consumption (see below). Over threshold -> `429 rate_limited`.
5. Schema validation -> `400 invalid_payload` on failure.
6. Duplicate suppression, then insert.

Every response carries a `correlation_id` (UUID) and nothing else: no table
names, no SQL, no upstream error text, no infrastructure hostnames. Logs record
the correlation id, the intake kind and the outcome. They do not record payload
contents or credentials.

## Atomic quota consumption

The limiter was previously read-then-write: `SELECT` the current count, compare,
then upsert. Under concurrency every request in a burst read the same pre-limit
value and all were admitted (see `rate-limit-bypass-results.md`).

It is now a single statement inside a `SECURITY DEFINER` function,
`public.consume_public_intake_quota(bucket_key, intake_kind, limit)`:

```sql
INSERT INTO public.public_intake_rate_limits (...)
VALUES (..., 1)
ON CONFLICT (bucket_key, intake_kind, window_start)
DO UPDATE SET request_count = public_intake_rate_limits.request_count + 1
RETURNING request_count
```

The row lock taken by `ON CONFLICT DO UPDATE` serialises concurrent callers, so
each request observes its own post-increment count. `EXECUTE` is revoked from
`PUBLIC`, `anon` and `authenticated`; only `service_role` can call it. The
table itself is `USING (false) WITH CHECK (false)` for clients.

Window is `date_trunc('hour', now())`, so the bucket rolls hourly.

## Identity trust boundary — stated honestly

The anonymous bucket key is only as trustworthy as the edge runtime's
`x-forwarded-for` handling. Empirically (see bypass results) the runtime
normalises that header to the true client address and a client-supplied value
does not create a new bucket. That is a property of the hosting platform, not
of AURA's code. AURA adds no compensating client-derived identity because the
only available options are invasive fingerprinting, which is out of scope by
instruction.

Callers behind one shared egress address share one bucket. This is a deliberate
availability/abuse trade-off for an unauthenticated marketing intake, not an
oversight.
