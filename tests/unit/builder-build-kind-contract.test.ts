/**
 * Regression contract for the Builder build-kind vocabulary.
 *
 * Production defect: template taxonomy (`twin_type: "operational"`) leaked into
 * the Builder `type` field and was rejected by `builders-create` with HTTP 400
 * VALIDATION_ERROR ("received: operational", options agent | process_twin |
 * 3d_twin), surfacing as "Edge Function returned a non-2xx status code".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BUILD_KINDS,
  isBuildKind,
  normalizeBuildKind,
  resolvePersistedBuildKind,
  resolveTemplateBuildKind,
} from '@/lib/builder/buildKind';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import dataCentreMaster from '@/data/templates/data-centre-master.json';

const SERVER_ACCEPTED = ['agent', 'process_twin', '3d_twin'] as const;

describe('build-kind helper', () => {
  it('exposes exactly the server-accepted vocabulary', () => {
    expect([...BUILD_KINDS]).toEqual([...SERVER_ACCEPTED]);
  });

  it('preserves every valid build kind', () => {
    for (const kind of SERVER_ACCEPTED) {
      expect(isBuildKind(kind)).toBe(true);
      expect(normalizeBuildKind(kind)).toBe(kind);
      expect(resolveTemplateBuildKind({ configType: kind, twinType: 'operational' })).toBe(kind);
    }
  });

  it('rejects template taxonomy and other unknown values', () => {
    for (const value of ['operational', 'workforce', 'compliance', 'financial', '', null, undefined, 42, {}]) {
      expect(isBuildKind(value)).toBe(false);
      expect(normalizeBuildKind(value)).toBeNull();
    }
  });

  it('normalizes facility / data-centre templates to 3d_twin', () => {
    expect(
      resolveTemplateBuildKind({
        twinType: 'operational',
        industry: 'Technology',
        department: 'Infrastructure Operations',
        templateId: 'datacentre-master-twin-v1',
        templateName: 'Data Centre Digital Twin',
      }),
    ).toBe('3d_twin');
  });

  it('falls back to the safe product default for non-facility templates', () => {
    expect(
      resolveTemplateBuildKind({
        twinType: 'workforce',
        industry: 'Retail',
        department: 'Merchandising',
        templateId: 'retail_inventory_optimization',
        templateName: 'Retail Inventory Optimization',
      }),
    ).toBe('agent');
  });

  it('recovers a legacy facility draft even when it was stored as an agent', () => {
    expect(resolvePersistedBuildKind({
      configType: 'agent',
      templateId: 'datacentre-master-twin-v1',
    })).toBe('3d_twin');
    expect(resolvePersistedBuildKind({
      configType: 'agent',
      twinId: 'facility-123',
    })).toBe('3d_twin');
  });

  it('preserves an explicit non-default product kind even when a twin is bound', () => {
    expect(resolvePersistedBuildKind({
      configType: 'process_twin',
      twinId: 'facility-123',
      templateId: 'datacentre-master-twin-v1',
    })).toBe('process_twin');
  });

  it('does not reclassify a generic agent from an unrelated template identity', () => {
    expect(resolvePersistedBuildKind({
      configType: 'agent',
      templateId: 'customer-support-agent-v1',
    })).toBe('agent');
  });

  it('never passes a free-form builder name into persisted identity inference', () => {
    const store = readFileSync('src/stores/wizardBuilderStore.ts', 'utf8');
    expect(store).not.toContain('templateName: builder.name');
  });
});

describe('templateToBlueprint build kind', () => {
  it('converts the Data Centre master template (twin_type "operational") to 3d_twin', () => {
    const template = (Array.isArray(dataCentreMaster) ? dataCentreMaster[0] : dataCentreMaster) as any;
    expect(template.twin_type).toBe('operational');

    const blueprint = templateToBlueprint(template);

    expect(blueprint.type).toBe('3d_twin');
    expect(SERVER_ACCEPTED).toContain(blueprint.type as any);
  });

  it('never emits a value outside the server-accepted vocabulary', () => {
    for (const twinType of ['operational', 'workforce', 'compliance', 'predictive', undefined]) {
      const blueprint = templateToBlueprint({
        id: 'tpl-1',
        name: 'Some Template',
        industry: 'Retail',
        department: 'Operations',
        description: 'x',
        twin_type: twinType,
        default_config: {},
      } as any);
      expect(SERVER_ACCEPTED).toContain(blueprint.type as any);
    }
  });
});
