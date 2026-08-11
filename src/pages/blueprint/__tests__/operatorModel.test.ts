import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildAttentionItems,
  buildOperatorMetrics,
  computeCoverage,
  defaultAccordionState,
  MODEL_ACCORDION_IDS,
  shouldExpandAttention,
  type OperatorModelInput,
} from '../operatorModel';

const blueprint = {
  id: 'bp-1',
  name: 'Test blueprint',
  agents: [{ id: 'a1' }],
  kpis: [],
  workflows: [],
  dataSources: [],
  integrations: [],
} as unknown as OperatorModelInput['blueprint'];

function makeInput(overrides: Partial<OperatorModelInput> = {}): OperatorModelInput {
  return {
    blueprint,
    summary: null,
    capacityKw: 4200,
    capacityLabel: '4.2 MW',
    capacityNote: null,
    quarantined: [],
    coverage: computeCoverage(24, 24),
    pue: 1.32,
    pueTarget: 1.28,
    pueState: 'derived',
    blueprintPath: '/blueprint/bp-1',
    ...overrides,
  };
}

describe('Stage 7K — operator metrics', () => {
  it('returns exactly four metrics', () => {
    expect(buildOperatorMetrics(makeInput()).map((m) => m.id)).toEqual([
      'capacity',
      'efficiency',
      'coverage',
      'blockers',
    ]);
  });

  it('marks capacity conflicting when records are quarantined', () => {
    const quarantined = [
      { record: { id: 'r1', label: 'Facility' }, reason: 'unitless' },
    ] as unknown as OperatorModelInput['quarantined'];
    const capacity = buildOperatorMetrics(makeInput({ quarantined }))[0];
    expect(capacity.state).toBe('conflicting');
  });

  it('reports unavailable rather than estimating a missing PUE', () => {
    const pue = buildOperatorMetrics(makeInput({ pue: null }))[1];
    expect(pue.state).toBe('unavailable');
    expect(pue.value).toBe('Not available');
  });

  it('discloses partial coverage instead of implying a complete model', () => {
    const coverage = buildOperatorMetrics(makeInput({ coverage: computeCoverage(40, 200) }))[2];
    expect(coverage.value).toBe('20%');
    expect(coverage.state).toBe('estimated');
    expect(coverage.detail).toContain('40 rendered of 200');
  });
});

describe('Stage 7K — requires attention', () => {
  it('is empty and collapsed when the model is clean', () => {
    const items = buildAttentionItems(makeInput());
    expect(items).toEqual([]);
    expect(shouldExpandAttention(items)).toBe(false);
  });

  it('sorts high severity first and expands by default', () => {
    const items = buildAttentionItems(
      makeInput({
        coverage: computeCoverage(10, 100),
        blueprint: { ...blueprint, agents: [] } as OperatorModelInput['blueprint'],
      }),
    );
    expect(items[0].severity).toBe('high');
    expect(shouldExpandAttention(items)).toBe(true);
    expect(items.every((i) => i.href.startsWith('/blueprint/bp-1?tab='))).toBe(true);
  });
});

describe('Stage 7K — collapsible groups', () => {
  it('defines no more than three groups, all collapsed without conflict', () => {
    expect(MODEL_ACCORDION_IDS.length).toBeLessThanOrEqual(3);
    expect(Object.values(defaultAccordionState(false))).toEqual([false, false, false]);
  });

  it('expands data confidence when a blocking conflict exists', () => {
    expect(defaultAccordionState(true)['data-confidence']).toBe(true);
  });
});

describe('Stage 7K — Model page ownership', () => {
  const page = readFileSync('src/pages/Blueprint.tsx', 'utf8');

  it('removes Human Roles from Blueprint', () => {
    expect(page).not.toMatch(/BlueprintRolesTab/);
  });

  it('renders the operator workspace in the Model tab', () => {
    expect(page).toMatch(/BlueprintModelWorkspace/);
  });

  it('keeps the Model workspace free of simulation execution', () => {
    const src = readFileSync('src/components/blueprint/model/BlueprintModelWorkspace.tsx', 'utf8');
    expect(src).not.toMatch(/createRun|queueRun|startSimulation|runSimulation|rerun/);
  });
});