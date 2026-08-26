/**
 * Multicloud portability evidence registry (generated).
 *
 * Entries are appended ONLY by `scripts/log-multicloud-evidence.mjs`, and only
 * when the referenced IaC / manifest artifacts exist on disk and a validation
 * result is supplied. Do not hand-edit to claim hyperscaler support: every
 * entry is re-validated at runtime by `validateMulticloudEvidenceRecord`, and
 * an entry with a missing artifact reference, unusable artifact class for its
 * stage, or a validation that did not pass is rejected and has no effect on
 * the portability matrix.
 *
 * Empty means no multicloud portability artifacts have been ingested. That is
 * a truthful state, not a gap to be filled with placeholders.
 */
export const MULTICLOUD_EVIDENCE_REGISTRY: readonly unknown[] = [];
