import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkflowSync, emitCatalogUpdate } from '@/hooks/useWorkflowSync';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/stores/builderStore');
vi.mock('@/hooks/use-toast');

describe('useWorkflowSync', () => {
  const mockSetState = vi.fn();
  const mockToast = vi.fn();
  let currentState = { workflowNodes: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    currentState = { workflowNodes: [] };

    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        state: currentState,
        setState: mockSetState,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    window.removeEventListener('builder:catalog:updated', () => {});
  });

  it('should not set up listener when systemId is null', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() => useWorkflowSync(null));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'builder:catalog:updated',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  it('should set up listener when systemId is provided', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() => useWorkflowSync('test-system-123'));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'builder:catalog:updated',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
  });

  it('should add integration node when catalog update event is dispatched', async () => {
    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('integration', 'zapier-crm', 'Zapier CRM');

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowNodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'zapier-crm',
              type: 'connector',
              label: 'Zapier CRM',
              config: {},
            }),
          ]),
        })
      );
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Workflow updated',
      description: 'Zapier CRM added to workflow palette',
    });
  });

  it('should add MCP tool node when MCP server is connected', async () => {
    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('mcp', 'github-mcp', 'GitHub MCP');

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowNodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'github-mcp',
              type: 'mcp-tool',
              label: 'GitHub MCP',
              config: {},
            }),
          ]),
        })
      );
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Workflow updated',
      description: 'GitHub MCP added to workflow palette',
    });
  });

  it('should not add duplicate nodes', async () => {
    currentState = {
      workflowNodes: [
        {
          id: 'existing-integration',
          type: 'connector',
          label: 'Existing',
          config: {},
          position: { x: 100, y: 100 },
        },
      ],
    };

    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('integration', 'existing-integration', 'Existing');

    await waitFor(() => {
      expect(mockSetState).not.toHaveBeenCalled();
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('should position new nodes based on existing nodes count', async () => {
    currentState = {
      workflowNodes: [
        { id: 'node1', type: 'connector', label: 'Node 1', config: {}, position: { x: 100, y: 100 } },
        { id: 'node2', type: 'connector', label: 'Node 2', config: {}, position: { x: 150, y: 100 } },
      ],
    };

    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('integration', 'node3', 'Node 3');

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowNodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'node3',
              position: { x: 200, y: 100 }, // 100 + (2 * 50)
            }),
          ]),
        })
      );
    });
  });

  it('should handle empty workflowNodes array', async () => {
    currentState = { workflowNodes: [] };

    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('integration', 'first-node', 'First Node');

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowNodes: [
            expect.objectContaining({
              id: 'first-node',
              position: { x: 100, y: 100 },
            }),
          ],
        })
      );
    });
  });

  it('should handle null workflowNodes', async () => {
    currentState = { workflowNodes: null as any };

    renderHook(() => useWorkflowSync('test-system-123'));

    emitCatalogUpdate('integration', 'first-node', 'First Node');

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowNodes: [
            expect.objectContaining({
              id: 'first-node',
            }),
          ],
        })
      );
    });
  });

  it('should clean up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWorkflowSync('test-system-123'));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'builder:catalog:updated',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('should not trigger when systemId changes to null', () => {
    const { rerender } = renderHook(
      ({ systemId }) => useWorkflowSync(systemId),
      { initialProps: { systemId: 'test-123' } }
    );

    // Change systemId to null
    rerender({ systemId: null });

    emitCatalogUpdate('integration', 'new-node', 'New Node');

    // Should not trigger because systemId is null
    expect(mockSetState).not.toHaveBeenCalled();
  });

  describe('emitCatalogUpdate', () => {
    it('should dispatch custom event with correct details', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      emitCatalogUpdate('integration', 'test-id', 'Test Name');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'builder:catalog:updated',
          detail: {
            type: 'integration',
            id: 'test-id',
            name: 'Test Name',
          },
        })
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('Emitted catalog update:', {
        type: 'integration',
        id: 'test-id',
        name: 'Test Name',
      });

      dispatchEventSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should work with MCP type', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      emitCatalogUpdate('mcp', 'mcp-server-id', 'MCP Server');

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            type: 'mcp',
            id: 'mcp-server-id',
            name: 'MCP Server',
          },
        })
      );

      dispatchEventSpy.mockRestore();
    });
  });
});
