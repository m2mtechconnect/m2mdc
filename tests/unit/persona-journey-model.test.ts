import { describe, expect, it } from 'vitest';
import { PLATFORM_ROLES } from '@/auth/permissions';
import { ORGANIZATION_ROLE_PERMISSIONS } from '@/auth/organizationAuthorization';
import {
  GOLDEN_PERSONA_JOURNEYS,
  ORGANIZATION_ROLE_PERSONA_FAMILY,
  PERSONA_FAMILIES,
  PERSONA_FAMILY_IDS,
  PLATFORM_ROLE_PERSONA_FAMILY,
  WORKFLOW_ROLE_VIEW_IDS,
  WORKFLOW_VIEW_PERSONA_FAMILY,
} from '@/config/personaJourneyModel';

describe('persona journey presentation model', () => {
  it('defines exactly five customer-facing persona families', () => {
    expect(PERSONA_FAMILY_IDS).toEqual([
      'owner_admin',
      'engineer_operator',
      'executive_manager',
      'compliance_analyst',
      'viewer_pilot',
    ]);
    expect(Object.keys(PERSONA_FAMILIES)).toEqual(PERSONA_FAMILY_IDS);
  });

  it('maps every platform role or explicitly marks it as non-marketed', () => {
    expect(Object.keys(PLATFORM_ROLE_PERSONA_FAMILY).sort()).toEqual([...PLATFORM_ROLES].sort());
    expect(PLATFORM_ROLE_PERSONA_FAMILY.marketing).toBeNull();
    expect(PLATFORM_ROLE_PERSONA_FAMILY.sales).toBeNull();
    expect(PLATFORM_ROLE_PERSONA_FAMILY.support).toBeNull();
  });

  it('maps every organization role into one of the five presentation families', () => {
    expect(Object.keys(ORGANIZATION_ROLE_PERSONA_FAMILY).sort()).toEqual(
      Object.keys(ORGANIZATION_ROLE_PERMISSIONS).sort(),
    );
    expect(new Set(Object.values(ORGANIZATION_ROLE_PERSONA_FAMILY))).toEqual(new Set(PERSONA_FAMILY_IDS));
  });

  it('keeps workflow views separate from authorization', () => {
    expect(WORKFLOW_ROLE_VIEW_IDS).toEqual(['engineer', 'operator', 'executive', 'compliance']);
    expect(Object.keys(WORKFLOW_VIEW_PERSONA_FAMILY)).toEqual(WORKFLOW_ROLE_VIEW_IDS);

    for (const family of Object.values(PERSONA_FAMILIES)) {
      expect(family).not.toHaveProperty('permissions');
      expect(family).not.toHaveProperty('role');
    }
  });

  it('defines one complete golden journey and negative case per family', () => {
    expect(GOLDEN_PERSONA_JOURNEYS.map((journey) => journey.family).sort()).toEqual(
      [...PERSONA_FAMILY_IDS].sort(),
    );

    for (const journey of GOLDEN_PERSONA_JOURNEYS) {
      expect(journey.phases.length).toBeGreaterThanOrEqual(5);
      expect(journey.requiredNegativeCase.length).toBeGreaterThan(30);
    }
  });
});
