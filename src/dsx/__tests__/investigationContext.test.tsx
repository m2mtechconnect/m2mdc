import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import {
  buildContextChips, contextSearch, linkWithContext, parseContext, EMPTY_CONTEXT,
} from '@/dsx/runtime/investigationContext';
import { relatedViewsForAsset, relatedViewsForDomain } from '@/dsx/workspaces/relatedViews';
import { ancestryFor, childrenOf, declaredBuildings, identityByAuraId } from '@/dsx/workspaces/facilityGraph';
import { EVIDENCE_BETA_RACKS, EVIDENCE_BETA_SITE } from '@/dsx/fixtures/evidenceBetaFacility';
import { EvidenceBetaProvider, useWorkspace } from '@/dsx/runtime/EvidenceBetaContext';
import { ContextBar } from '@/components/dsx/ContextBar';

const rack = EVIDENCE_BETA_RACKS[0];

describe('investigation context serialisation', () => {
  it('round-trips through the URL', () => {
    const ctx = { ...EMPTY_CONTEXT, stable_asset_id: rack.aura_asset_id, workload_id: 'wl-1', time_range: '1h' };
    const restored = parseContext(contextSearch(ctx).slice(1));
    expect(restored.stable_asset_id).toBe(rack.aura_asset_id);
    expect(restored.workload_id).toBe('wl-1');
    expect(restored.time_range).toBe('1h');
  });

  it('omits empty values so links stay readable', () => {
    expect(contextSearch(EMPTY_CONTEXT)).toBe('');
  });

  it('preserves the context when linking to another workspace', () => {
    const ctx = { ...EMPTY_CONTEXT, stable_asset_id: rack.aura_asset_id };
    const href = linkWithContext('/dsx/evidence-beta/power', ctx, 'thermal');
    expect(href).toContain(`asset=${rack.aura_asset_id}`);
    expect(href).toContain('from=thermal');
  });

  it('reports an unresolved asset id instead of hiding it', () => {
    const chips = buildContextChips({ ...EMPTY_CONTEXT, stable_asset_id: 'not-a-real-id' }, identityByAuraId);
    expect(chips[0].value).toMatch(/Unavailable/);
  });

  it('carries the full deep-link contract through the URL', () => {
    const ctx = {
      ...EMPTY_CONTEXT,
      facility_id: 'fac-1',
      data_mode: 'SIMULATED',
      run_id: 'sim:run:1',
      observation_tick: '3',
      stable_asset_id: rack.aura_asset_id,
      metric_id: 'pue',
      time_range: '1h',
      overlay_id: 'thermal',
      inspector: 'asset',
    };
    const restored = parseContext(contextSearch(ctx).slice(1));
    expect(restored).toEqual(ctx);
  });
});

describe('facility hierarchy scoping', () => {
  it('derives ancestry root first without inventing parents', () => {
    const chain = ancestryFor(rack.aura_asset_id);
    expect(chain[0].stable_asset_id).toBe(EVIDENCE_BETA_SITE.aura_asset_id);
    expect(chain[chain.length - 1].stable_asset_id).toBe(rack.aura_asset_id);
  });

  it('declares exactly one building, so no related buildings can be shown', () => {
    expect(declaredBuildings()).toHaveLength(1);
    expect(childrenOf(EVIDENCE_BETA_SITE.aura_asset_id).length).toBeGreaterThan(0);
  });
});

describe('related views', () => {
  it('derives destinations from the asset class, not the page', () => {
    expect(relatedViewsForAsset('rack').map((v) => v.id)).toContain('thermal');
    expect(relatedViewsForAsset('ups').map((v) => v.id)).toContain('power');
    expect(relatedViewsForDomain('financial').map((v) => v.id)).toContain('financials');
  });
});

function Probe() {
  const { selectAsset } = useWorkspace();
  const location = useLocation();
  return (
    <div>
      <button onClick={() => selectAsset(rack.aura_asset_id)}>select rack</button>
      <span data-testid="search">{location.search}</span>
    </div>
  );
}

function renderShell(initial = '/dsx/evidence-beta') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/dsx/evidence-beta"
            element={
              <EvidenceBetaProvider>
                <ContextBar />
                <Probe />
              </EvidenceBetaProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('shared context bar', () => {
  it('starts at facility scope and writes the selection into the URL', () => {
    renderShell();
    expect(screen.getByTestId('dsx-context-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByText('select rack'));
    expect(screen.getByTestId('search').textContent).toContain(`asset=${rack.aura_asset_id}`);
    expect(screen.getByTestId('dsx-context-chip-stable_asset_id').textContent).toContain(rack.name);
  });

  it('restores the scope from a deep link and can clear it', () => {
    renderShell(`/dsx/evidence-beta?asset=${rack.aura_asset_id}`);
    const chip = screen.getByTestId('dsx-context-chip-stable_asset_id');
    expect(chip.textContent).toContain(rack.name);
    fireEvent.click(screen.getByTestId('dsx-context-clear'));
    expect(screen.queryByTestId('dsx-context-chip-stable_asset_id')).toBeNull();
  });
});
