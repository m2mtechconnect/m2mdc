# Control-plane inspection: Git/GitHub binding

Read-only inspection complete. No files edited, no commits, no deploys, no database access.

## Current /dev-server state

- HEAD: `c9159dc44473c619a808b07386cfc7d5910f9b7f` ("Work in progress", 2026-08-24T15:28Z)
- Current branch: `edit/edt-45ebb909-7f6a-404b-b10a-d05036c0e184` (ephemeral per-edit branch)
- Working tree: clean (0 modified files)
- Tracked upstream config present for exactly one long-lived branch: `branch.remediation/hybrid-stack-p0` -> `origin/remediation/hybrid-stack-p0`. No `branch.main` config exists.

## Remote refs (Lovable-managed git storage, not GitHub directly)

`origin` points at the Lovable internal repo (`git.private.lovable-gcp.code.storage/<project-id>.git`), which is the mirror the GitHub sync writes through. Relevant heads:

- `refs/heads/main` = `82fdb333ec70face80b4dc0a774b8ed6ed553959` ("Audited & fixed lint errors", 2026-08-19) — stale mirror branch, is an ancestor of HEAD.
- `refs/heads/remediation/hybrid-stack-p0` = `5d4042083d30731cb949fd0a68b00c3e87287a06` (2026-08-24T15:00Z) — HEAD is exactly 1 commit ahead of this.
- Backup refs `lovable-backup-remediation-hybrid-stack-p0-*` confirm the project's source branch is the remediation branch.

## GitHub refs (`m2mtechconnect/m2mdc`)

- `main` = `f740cb7443c5173a49962d50091efccd088e1aa1` ("chore(release): force provider ingestion after ref reconciliation", 2026-08-24T14:57Z)
- `remediation/hybrid-stack-p0` = `5d404208…` — identical to the project's source branch head.

Conclusion: the project is **still bound to `remediation/hybrid-stack-p0`**, not `main`. GitHub `main` (`f740cb74`) exists in the local object store but is **not an ancestor of HEAD**; HEAD diverges from it by 3 files (`src/integrations/supabase/types.ts`, `previewAuthStorage.ts`, and one more) — provider-generated drift only, +410/−16.

## Can the platform repoint to `main`?

No. There is no first-class provider connection tool exposed to me for changing the GitHub source branch — the available tool surface covers publishing, secrets, database, connectors, and folders, but nothing that edits the GitHub sync branch binding. The only ways I could "make main authoritative" from here would be raw git ref surgery on the project repo, which is both prohibited in this mode and not a provider connection action. I therefore did not perform any repoint.

## Exact non-destructive action required (user-performed, in the Lovable UI)

1. Open Project Settings -> GitHub (workspace Git settings) for this project.
2. In the connected repository `m2mtechconnect/m2mdc`, change the **source/tracked branch** from `remediation/hybrid-stack-p0` to `main`.
3. Confirm the re-sync when prompted. Choose the option that takes GitHub as authoritative (overwrite project source) rather than merging — this discards the provider-generated drift on HEAD (`types.ts`, `previewAuthStorage.ts`), which is regenerated automatically on the next backend interaction.
4. Optionally disconnect and reconnect the repository selecting `main` as the default branch, if the settings page does not offer an in-place branch change.

This is non-destructive to GitHub: nothing is force-pushed, `remediation/hybrid-stack-p0` remains intact at `5d404208`, and the pre-switch project state is retained in the `lovable-backup-remediation-hybrid-stack-p0-*` refs already in the mirror.

## After the repoint, verification I can run (read-only)

- Confirm `/dev-server` HEAD resolves to `f740cb7443c…` (or the then-current `main` tip) and the tree matches GitHub `main`.
- Confirm `git config branch.main.merge` = `refs/heads/main` and no remediation upstream remains.
- Confirm working tree clean and `release.json` fingerprint on the deployed site matches the new source SHA.
