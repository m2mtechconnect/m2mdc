# Licence decision

Reviewed at pinned commit `d940314d0593bbba1bae51e40ae7f9fd48358e18`:
`LICENSE` (reference copy of the NVIDIA Software License Agreement),
`PRODUCT_TERMS_OMNIVERSE`, `ATTRIBUTIONS.md`, `3RD_PARTY_NOTICES.md`, and the
NGC listing terms (NVIDIA Sample Data License for Evaluation).

The repository is **not** published under a permissive open-source licence. It
carries the NVIDIA Software License Agreement, which grants a limited,
non-transferable, non-sublicensable licence to install, use and reproduce the
Software subject to NVIDIA's terms. It does not grant a clear right of public
redistribution of the source material by a third party.

## Decisions

| Source | Decision |
| --- | --- |
| GitHub source files (raw text) | `REQUIRES_LEGAL_REVIEW` for redistribution - **not committed to this repository** |
| Normalized metadata derived from those files (values, units, formulas, configuration identities, with attribution) | `APPROVED_AUTHENTICATED_DEMO` |
| NGC DSX dataset v2.1 archive and extracted binaries | `BLOCKED` - not retrieved, and would be `REDISTRIBUTION_PROHIBITED` for public hosting |
| Official documentation pages | `DOCUMENTATION_ONLY`, linked not copied |

## Enforcement

- Raw NVIDIA files are downloaded to a temporary path at ingestion time and are
  never written into the repository or into `public/`.
- The reference facility and its records are gated to authenticated users;
  dataset activation is admin-only.
- No NGC archive or extracted binary asset is committed or exposed by URL.
- No credentials or signed URLs appear in source, logs, or evidence files.

This is an engineering-applied restriction, not a legal opinion. Public exposure
of the reference baseline requires sign-off from counsel before the
`APPROVED_PUBLIC_REFERENCE` status may be assigned.
