# Scope review

Requested scope set (source: supabase/functions/_shared/managedUserBindings.ts):

- https://www.googleapis.com/auth/drive.readonly

Read-only. No write, delete, share, or administrative scope is requested. Identity scopes (userinfo.email / userinfo.profile) are not requested because the acceptance test needs only a file listing.

Acceptance fixture expectation: a manually created folder "AURA Connector Acceptance" containing facility-reference-summary.txt, connector-acceptance.json, readme.md, all synthetic and non-confidential.

If the linked client mandates a materially broader scope, authorization must stop and the exact scope must be reported before consent.

Status: APPROVED IN DESIGN, NOT YET EXERCISED.
