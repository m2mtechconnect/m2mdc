/**
 * Router-level regression for finding PW-P2-01.
 *
 * A valid deep link (`?step=simulate`) must survive mount. The store->URL
 * effect previously fired with the stale default step and rewrote the URL back
 * to `?step=inspect`, so the deep link silently lost.
 */
import { describe, expect, it } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useWorkflowStep } from '../useWorkflowStep';
import { useWorkspaceStore } from '../workspaceStore';

function wrapper(initial: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
}

function useProbe() {
  const state = useWorkflowStep(true);
  const location = useLocation();
  return { state, search: location.search };
}

describe('useWorkflowStep against a real router', () => {
  it('keeps a deep-linked step instead of rewriting it to the store default', async () => {
    useWorkspaceStore.setState({ activeTool: 'inspect', runs: [] });
    const { result } = renderHook(useProbe, { wrapper: wrapper('/simulation?step=simulate') });
    await waitFor(() => expect(result.current.state.step).toBe('simulate'));
    expect(result.current.search).toContain('step=simulate');
    expect(useWorkspaceStore.getState().activeTool).toBe('simulate');
  });

  it('still writes the URL when the user changes step in the app', async () => {
    useWorkspaceStore.setState({ activeTool: 'inspect', runs: [] });
    const { result } = renderHook(useProbe, { wrapper: wrapper('/simulation?step=inspect') });
    await waitFor(() => expect(result.current.state.step).toBe('inspect'));
    act(() => useWorkspaceStore.getState().setTool('configure'));
    await waitFor(() => expect(result.current.search).toContain('step=configure'));
  });

  it('rewrites a gated step back to simulate when no run exists', async () => {
    useWorkspaceStore.setState({ activeTool: 'inspect', runs: [] });
    const { result } = renderHook(useProbe, { wrapper: wrapper('/simulation?step=compare') });
    await waitFor(() => expect(result.current.state.step).toBe('simulate'));
    expect(result.current.search).toContain('step=simulate');
    expect(result.current.state.notice).toContain('completed run');
  });
});
