# RLS policy inventory and closure

## Findings (before)

Four tables carried permissive `SELECT ... USING (true)` policies granted to the
`public` role, producing nine public-read scanner warnings:

| Table | Policy (before) | Command | Qualifier |
| --- | --- | --- | --- |
| site_pages | Anyone can view site pages | SELECT | true |
| crawl_jobs | Anyone can view crawl jobs | SELECT | true |
| recommendations | Anyone can view recommendations | SELECT | true |
| website_content_cache | Anyone can view cached website content | SELECT | true |

Content classification: crawled customer site URLs, extracted page text, cache
bodies, generated recommendations and crawl job metadata - i.e. tenant content,
not public marketing copy.

## Runtime access tests (before fix)

Anonymous PostgREST reads with the publishable key returned **HTTP 401
`42501 permission denied`** on all four tables: no table-level `GRANT` exists
for `anon` or `authenticated` (`information_schema.role_table_grants` returned
0 rows). The permissive policies were therefore unreachable at runtime, but
latent: a single future GRANT would have opened tenant content to anonymous
readers.

Classification: **SECURITY_DEFECT (latent)** - not FALSE_POSITIVE, because the
policy intent is wrong even though the grant layer currently blocks it.

## Remediation

Reversible migration dropping the four permissive read policies. Only edge
functions touch these tables, and they use the service role, which bypasses
RLS - so no product behaviour changes. Restoring the previous state is a single
`CREATE POLICY` per table.

## Runtime access tests (after fix)

Anonymous reads: 401 on all four tables. Remaining policies are the
`service_role` management policies only. No public landing-page content depends
on these tables.

Not covered: authenticated same-tenant / cross-tenant read matrices are moot
here because no role holds a table grant, but they remain unexecuted for the
wider schema - BLOCKED_UNVERIFIED.
