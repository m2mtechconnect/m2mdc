# Rate-limit bypass results

Threshold under test: 5 requests per hour per bucket. Probes use payloads that
fail schema validation *after* the limiter runs, so the limiter is exercised
without writing a single intake row.

## Before the fix — real defect found

| Test | Result |
| --- | --- |
| Sequential requests, 8 | 5 x `400`, then `429`, `429`, `429` — limit held |
| **Concurrent burst of 12 on a fresh bucket** | **12 admitted, 0 rejected — limit completely bypassed** |

Root cause: read-then-write. Every request in the burst read the same
pre-increment count and each wrote `request_count = 1`. Sequential traffic hid
the flaw entirely.

## Fix

`public.consume_public_intake_quota()` — single-statement atomic
`INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count`, service-role
only. See `rate-limit-architecture.md`.

## After the fix

| Test | Result |
| --- | --- |
| Concurrent burst of 12 | 2 admitted, 10 rejected `429` — the two admissions are the requests whose atomic count landed at or below the remaining quota |
| Counter after the burst | `request_count` accumulates every request, including rejected ones |
| Spoofed `X-Forwarded-For` (3 distinct fake addresses) | `429` — no new bucket created |
| Spoofed `X-Real-IP` | `429` — header not read at all |
| Rotated `X-Client-Info` values | `429` — header does not participate in the key |
| Missing anonymous session identifier | `429` — no session identifier is used |
| Oversized payload (20 KB) | `413 payload_too_large`, rejected before parsing |
| Malformed JSON | `400 invalid_payload` |
| Honeypot field set | `202`, no insert, bot not informed |
| Duplicate payload | suppressed downstream of the limiter |

Responses contain only an error code and a correlation id. No table name, SQL
fragment, stack, or hostname is returned.

## Limitations, stated plainly

- **Window reset was not observed.** The window is hourly and the run did not
  span one. The reset is a `date_trunc('hour', now())` key change, which is
  structural, but it is recorded as `BLOCKED_UNVERIFIED` rather than claimed.
- **Independent-user non-interference was not proved.** All probes originate
  from one egress address, so two genuinely distinct anonymous clients could not
  be simulated. Signed-in callers demonstrably bucket by `user:<sub>` and are
  therefore independent; distinct anonymous clients are `BLOCKED_UNVERIFIED`.
- **Header trust is a platform property.** Spoofing failed because the edge
  runtime normalises `x-forwarded-for`. AURA does not independently verify the
  client address and cannot. If the function were ever fronted by a different
  proxy, this guarantee would need re-testing.
