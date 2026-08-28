import type { DataCentreTwin } from '@/context/ActiveTwinContext';
import { EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';

/**
 * The built-in Evidence dataset is valid only for its deterministic fixture.
 * The reference-facility alias is the one intentional compatibility mapping
 * used by automated and local demonstration journeys. Stored tenant facility
 * ids are never silently mapped onto this fixture.
 */
export const EVIDENCE_REFERENCE_FACILITY_ALIAS = 'aura-reference-facility';

export interface EvidenceFacilityScope {
  requestedId: string | null;
  availability: 'demonstration' | 'unavailable';
  displayName: string;
  contextLabel: string;
  headerLabel: string;
  truthLabel: string;
  reason: string | null;
}

export function resolveEvidenceFacilityScope(
  requestedId: string | null,
  twins: ReadonlyArray<Pick<DataCentreTwin, 'id' | 'name'>>,
): EvidenceFacilityScope {
  if (!requestedId) {
    return {
      requestedId,
      availability: 'demonstration',
      displayName: EVIDENCE_BETA_SITE.name,
      contextLabel: `${EVIDENCE_BETA_SITE.name} (demonstration fixture)`,
      headerLabel: `Demonstration facility: ${EVIDENCE_BETA_SITE.name} (active facility not selected)`,
      truthLabel: EVIDENCE_BETA_SITE.name,
      reason: null,
    };
  }

  if (
    requestedId === EVIDENCE_BETA_SITE.aura_asset_id ||
    requestedId === EVIDENCE_REFERENCE_FACILITY_ALIAS
  ) {
    return {
      requestedId,
      availability: 'demonstration',
      displayName: EVIDENCE_BETA_SITE.name,
      contextLabel: `${EVIDENCE_BETA_SITE.name} (reference demonstration)`,
      headerLabel: `Demonstration facility: ${EVIDENCE_BETA_SITE.name} (reference demonstration)`,
      truthLabel: EVIDENCE_BETA_SITE.name,
      reason: null,
    };
  }

  const knownTwin = twins.find((candidate) => candidate.id === requestedId) ?? null;
  const displayName = knownTwin?.name?.trim() || 'Unavailable (record not found)';
  return {
    requestedId,
    availability: 'unavailable',
    displayName,
    contextLabel: knownTwin ? `${displayName} — evidence unavailable` : displayName,
    headerLabel: knownTwin
      ? `Facility evidence unavailable: ${displayName}`
      : 'Facility evidence unavailable: record not found',
    truthLabel: knownTwin ? `${displayName} — no bound evidence dataset` : 'No bound evidence dataset',
    reason: knownTwin
      ? 'No Evidence dataset is bound to the selected facility. Demonstration values are not substituted.'
      : 'The requested facility record could not be resolved. Demonstration values are not substituted.',
  };
}
