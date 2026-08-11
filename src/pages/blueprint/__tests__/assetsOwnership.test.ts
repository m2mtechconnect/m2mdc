/**
 * Stage 7K closure - Assets & Systems ownership and capacity-rendering contract.
 */
import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatPower } from '@/lib/units/power';
import { BLUEPRINT_TABS, CONTROLS_SUBTABS, legacyManageRedirect } from '../tabModel';

const PAGE = readFileSync('src/pages/Blueprint.tsx', 'utf8');
const ASSETS = readFileSync('src/components/blueprint/tabs/BlueprintOverviewTab.tsx', 'utf8');

describe('canonical power formatter', () => {
  it('renders 10,000 kW as 10 MW', () => {
    expect(formatPower(10_000)).toBe('10 MW');
  });

  it('renders 10,000,000 kW as 10 GW', () => {
    expect(formatPower(10_000_000)).toBe('10 GW');
  });

  it('does not heuristically reinterpret units', () => {
    // The formatter only scales; it never divides by 1000 to "fix" a value.
    expect(formatPower(1)).toBe('1 kW');
    expect(formatPower(999)).toBe('999 kW');
    expect(formatPower(1000)).toBe('1 MW');
  });
});

describe('Blueprint capacity rendering', () => {
  const FILES = [
    'src/pages/Blueprint.tsx',
    'src/components/blueprint/tabs/BlueprintOverviewTab.tsx',
    'src/components/blueprint/ExecutiveSummaryBlock.tsx',
    'src/components/blueprint/DesignViewHeader.tsx',
    'src/components/blueprint/DesignerModeHeader.tsx',
    'src/components/blueprint/BlueprintValidationPanel.tsx',
  ].filter(existsSync);

  it('never suffixes a capacity value with a raw unit label', () => {
    const unsafe = /capacityKw[^\n]*(\}\s*(kW|MW|GW)\b|\+\s*['"`]\s*(kW|MW|GW))/;
    const offenders = FILES.filter((f) => unsafe.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('renders the tier once, without a duplicated Tier prefix', () => {
    // The label supplies the word "Tier"; the value must be stripped so a
    // stored "Tier-III" never renders as "Tier Tier-III".
    expect(ASSETS).toMatch(/stripTierPrefix\(blueprint\.tier\)/);
    expect(ASSETS).not.toMatch(/Tier \{blueprint\.tier\}/);
  });
});

describe('Stage 7K closure - Assets & Systems ownership', () => {
  it('does not reproduce the data-source or integration registries', () => {
    expect(PAGE).not.toMatch(/BlueprintDataTab/);
    expect(existsSync('src/components/blueprint/tabs/BlueprintDataTab.tsx')).toBe(false);
    expect(ASSETS).not.toMatch(/DataSourceCard|IntegrationCard/);
  });

  it('shows only a contextual connectivity reference that links to Manage', () => {
    expect(PAGE).toMatch(/AssetConnectivitySummary/);
    const summary = readFileSync(
      'src/components/blueprint/assets/AssetConnectivitySummary.tsx',
      'utf8',
    );
    expect(summary).toMatch(/\/manage\/integrations/);
    expect(summary).toMatch(/View in Manage/);
    expect(summary).not.toMatch(/credential|secret|Table\b/i);
  });

  it('redirects legacy registry deep links to Manage', () => {
    expect(legacyManageRedirect('data')).toBe('/manage/integrations');
    expect(legacyManageRedirect('integrations')).toBe('/manage/integrations');
    expect(legacyManageRedirect('assets')).toBeNull();
    expect(legacyManageRedirect(null)).toBeNull();
  });

  it('does not render Model, summary, agent, KPI, workflow, scenario or roles surfaces', () => {
    for (const forbidden of [
      /BlueprintModelSection|ThreeCanvas|ModelCanvas/,
      /ExecutiveSummaryBlock/,
      /AgentHealthPanel/,
      /KPIEnhancementsPanel/,
      /WorkflowEnhancementsPanel/,
      /ScenariosTab|BlueprintRolesTab/,
    ]) {
      expect(ASSETS).not.toMatch(forbidden);
    }
  });

  it('keeps five top-level tabs and three Controls subtabs', () => {
    expect(BLUEPRINT_TABS).toHaveLength(5);
    expect(CONTROLS_SUBTABS).toHaveLength(3);
  });
});