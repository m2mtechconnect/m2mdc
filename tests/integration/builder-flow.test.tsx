import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { describeWithBackend } from '../_setup/backendSuite';
import { renderHook, waitFor, act } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import { useBuilderStore } from '@/stores/builderStore';
import { useBuilderAutosave } from '@/hooks/useBuilderAutosave';
import { useBuilderHistory } from '@/hooks/useBuilderHistory';
import { useWorkflowSync, emitCatalogUpdate } from '@/hooks/useWorkflowSync';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describeWithBackend('Builder Flow Integration Tests', () => {
  let testUserId: string;
  let testSystemId: string;
  const createdSystemIds: string[] = [];

  beforeAll(async () => {
    // Get or create test user session
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      testUserId = session.session.user.id;
    } else {
      // Sign up test user
      const { data, error } = await supabase.auth.signUp({
        email: `builder-test-${Date.now()}@m2m.test`,
        password: 'TestPass123!@#',
      });
      
      if (error) {
        console.error('Failed to create test user:', error);
        throw error;
      }
      
      testUserId = data.user!.id;
    }
  });

  afterAll(async () => {
    // Cleanup all created systems
    for (const systemId of createdSystemIds) {
      await supabase.from('system_builder_state').delete().eq('system_id', systemId);
      await supabase.from('agents').delete().eq('id', systemId);
    }
  });

  beforeEach(() => {
    // Reset builder store
    useBuilderStore.getState().reset();
  });

  describe('Autosave Integration', () => {
    it('should autosave system to database after changes', async () => {
      const store = useBuilderStore.getState();
      
      // Set initial state
      act(() => {
        store.setState({
          systemName: 'Autosave Test System',
          department: 'Engineering',
          outcome: 'Test autosave functionality',
          successMetric: 'System saved within 1 second',
        });
      });

      // Trigger save
      await act(async () => {
        await store.save();
      });

      // Verify system was created in database
      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      const { data: system, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      expect(error).toBeNull();
      expect(system?.name).toBe('Autosave Test System');
      expect(system?.config?.department).toBe('Engineering');
    });

    it('should persist builder state across sessions', async () => {
      // Create a system with state
      const store = useBuilderStore.getState();
      
      act(() => {
        store.setState({
          systemName: 'Persistence Test',
          department: 'Finance',
          outcome: 'Test persistence',
          successMetric: 'State preserved after reload',
          selectedTemplate: 'customer-support',
          selectedModel: 'google/gemini-2.5-flash',
        });
        store.setCurrentStep(2);
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      // Reset store (simulate page reload)
      store.reset();

      // Load state from database
      await act(async () => {
        await store.load(systemId!);
      });

      // Verify state was restored
      expect(store.state.systemName).toBe('Persistence Test');
      expect(store.state.department).toBe('Finance');
      expect(store.state.selectedTemplate).toBe('customer-support');
      expect(store.state.selectedModel).toBe('google/gemini-2.5-flash');
      expect(store.currentStep).toBe(2);
    });

    it('should handle concurrent saves gracefully', async () => {
      const store = useBuilderStore.getState();
      
      act(() => {
        store.setState({
          systemName: 'Concurrent Test',
          department: 'Operations',
        });
      });

      // Trigger multiple saves concurrently
      const savePromises = [
        store.save(),
        store.save(),
        store.save(),
      ];

      await act(async () => {
        await Promise.all(savePromises);
      });

      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      // Verify only one system was created
      const { data: systems, error } = await supabase
        .from('agents')
        .select('*')
        .eq('name', 'Concurrent Test');

      expect(error).toBeNull();
      expect(systems).toHaveLength(1);
    });

    it('should update existing system on subsequent saves', async () => {
      const store = useBuilderStore.getState();
      
      // Initial save
      act(() => {
        store.setState({
          systemName: 'Update Test',
          department: 'Marketing',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      // Update state
      act(() => {
        store.setState({
          outcome: 'Updated outcome',
          successMetric: 'Updated metric',
          selectedModel: 'openai/gpt-5-mini',
        });
      });

      await act(async () => {
        await store.save();
      });

      // Verify system was updated, not duplicated
      const { data: systems, error: systemsError } = await supabase
        .from('agents')
        .select('*')
        .eq('name', 'Update Test');

      expect(systemsError).toBeNull();
      expect(systems).toHaveLength(1);
      expect(systems?.[0]?.config?.outcome).toBe('Updated outcome');
      expect(systems?.[0]?.config?.selectedModel).toBe('openai/gpt-5-mini');
    });
  });

  describe('History Integration', () => {
    it('should track state changes with history', async () => {
      const store = useBuilderStore.getState();
      const { result: historyResult } = renderHook(() => useBuilderHistory(), { wrapper });

      // Create initial system
      act(() => {
        store.setState({
          systemName: 'History Test',
          department: 'Sales',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      createdSystemIds.push(systemId!);

      // Add to history
      act(() => {
        historyResult.current.addToHistory('Initial state');
      });

      // Make changes
      act(() => {
        store.setState({
          outcome: 'First change',
        });
      });

      await act(async () => {
        await store.save();
      });

      act(() => {
        historyResult.current.addToHistory('Added outcome');
      });

      // Verify history was created
      expect(historyResult.current.historyLength).toBe(2);
      expect(historyResult.current.canUndo).toBe(true);

      // Undo and verify
      act(() => {
        historyResult.current.undo();
      });

      expect(store.state.outcome).toBe('');
    });

    it('should preserve undo/redo state after save', async () => {
      const store = useBuilderStore.getState();
      const { result: historyResult } = renderHook(() => useBuilderHistory(), { wrapper });

      act(() => {
        store.setState({
          systemName: 'Undo Redo Test',
          department: 'HR',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      createdSystemIds.push(systemId!);

      // Create history
      act(() => {
        historyResult.current.addToHistory('State 1');
      });

      act(() => {
        store.setState({ outcome: 'Change 1' });
      });

      act(() => {
        historyResult.current.addToHistory('State 2');
      });

      act(() => {
        store.setState({ outcome: 'Change 2' });
      });

      act(() => {
        historyResult.current.addToHistory('State 3');
      });

      // Save current state
      await act(async () => {
        await store.save();
      });

      // Undo twice
      act(() => {
        historyResult.current.undo();
        historyResult.current.undo();
      });

      expect(historyResult.current.canRedo).toBe(true);

      // Redo once
      act(() => {
        historyResult.current.redo();
      });

      // Save again
      await act(async () => {
        await store.save();
      });

      // Verify state persisted correctly
      const { data: system } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      expect(system?.config?.outcome).toBe('Change 1');
    });
  });

  describe('Workflow Sync Integration', () => {
    it('should sync workflow nodes when integrations are added', async () => {
      const store = useBuilderStore.getState();
      
      // Create system
      act(() => {
        store.setState({
          systemName: 'Workflow Sync Test',
          department: 'IT',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      // Set up workflow sync
      renderHook(() => useWorkflowSync(systemId), { wrapper });

      // Emit catalog update (simulating integration connection)
      act(() => {
        emitCatalogUpdate('integration', 'zapier-crm', 'Zapier CRM Connector');
      });

      // Wait for workflow sync
      await waitFor(() => {
        const nodes = store.state.workflowNodes;
        expect(nodes).toBeDefined();
        expect(nodes.some((n: any) => n.id === 'zapier-crm')).toBe(true);
      });

      // Save and verify in database
      await act(async () => {
        await store.save();
      });

      const { data: system } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      expect(system?.config?.workflowNodes).toBeDefined();
      expect(
        system?.config?.workflowNodes.some((n: any) => n.id === 'zapier-crm')
      ).toBe(true);
    });

    it('should sync multiple MCP servers to workflow', async () => {
      const store = useBuilderStore.getState();
      
      act(() => {
        store.setState({
          systemName: 'MCP Sync Test',
          department: 'DevOps',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      createdSystemIds.push(systemId!);

      renderHook(() => useWorkflowSync(systemId), { wrapper });

      // Add multiple MCP servers
      act(() => {
        emitCatalogUpdate('mcp', 'github-mcp', 'GitHub MCP');
        emitCatalogUpdate('mcp', 'slack-mcp', 'Slack MCP');
        emitCatalogUpdate('mcp', 'jira-mcp', 'Jira MCP');
      });

      await waitFor(() => {
        const nodes = store.state.workflowNodes;
        expect(nodes.length).toBeGreaterThanOrEqual(3);
      });

      // Verify all nodes were added
      const nodes = store.state.workflowNodes;
      expect(nodes.some((n: any) => n.id === 'github-mcp')).toBe(true);
      expect(nodes.some((n: any) => n.id === 'slack-mcp')).toBe(true);
      expect(nodes.some((n: any) => n.id === 'jira-mcp')).toBe(true);

      // Save
      await act(async () => {
        await store.save();
      });
    });
  });

  describe('Complete Builder Flow', () => {
    it('should complete full builder flow from step 1 to 5', async () => {
      const store = useBuilderStore.getState();
      const { result: historyResult } = renderHook(() => useBuilderHistory(), { wrapper });

      // Step 1: Define Goal
      act(() => {
        store.setCurrentStep(1);
        store.setState({
          systemName: 'Complete Flow Test',
          department: 'Product',
          outcome: 'Automate customer onboarding',
          successMetric: '80% reduction in manual work',
        });
      });

      await act(async () => {
        await store.save();
      });

      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      act(() => {
        historyResult.current.addToHistory('Completed Step 1');
      });

      // Step 2: Choose Template
      act(() => {
        store.setCurrentStep(2);
        store.setState({
          selectedTemplate: 'customer-onboarding',
        });
      });

      await act(async () => {
        await store.save();
      });

      act(() => {
        historyResult.current.addToHistory('Completed Step 2');
      });

      // Step 3: Configure AI & Tools
      act(() => {
        store.setCurrentStep(3);
        store.setState({
          selectedModel: 'google/gemini-2.5-flash',
          temperature: 0.3,
          topK: 20,
          topN: 6,
          hybridSearch: true,
          geminiEnabled: true,
        });
      });

      // Add integration via workflow sync
      const syncHook = renderHook(() => useWorkflowSync(systemId), { wrapper });

      act(() => {
        emitCatalogUpdate('integration', 'salesforce', 'Salesforce CRM');
      });

      await waitFor(() => {
        expect(store.state.workflowNodes.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await store.save();
      });

      act(() => {
        historyResult.current.addToHistory('Completed Step 3');
      });

      // Step 4: Build Workflow (workflow nodes already added)
      act(() => {
        store.setCurrentStep(4);
      });

      await act(async () => {
        await store.save();
      });

      act(() => {
        historyResult.current.addToHistory('Completed Step 4');
      });

      // Step 5: Deploy (set ROI assumptions)
      act(() => {
        store.setCurrentStep(5);
        store.setState({
          roiAssumptions: {
            timeSavedMin: 45,
            runsPerWeek: 50,
            costPerHour: 80,
            accuracyPct: 40,
            costPerError: 600,
          },
        });
      });

      await act(async () => {
        await store.save();
      });

      act(() => {
        historyResult.current.addToHistory('Completed Step 5');
      });

      // Verify final state in database
      const { data: finalSystem, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      expect(error).toBeNull();
      expect(finalSystem?.name).toBe('Complete Flow Test');
      expect(finalSystem?.config?.department).toBe('Product');
      expect(finalSystem?.config?.selectedModel).toBe('google/gemini-2.5-flash');
      expect(finalSystem?.config?.workflowNodes).toBeDefined();
      expect(finalSystem?.config?.workflowNodes.length).toBeGreaterThan(0);

      // Verify builder state
      const { data: builderState } = await supabase
        .from('system_builder_state')
        .select('*')
        .eq('system_id', systemId)
        .eq('step', 5)
        .single();

      expect(builderState).toBeTruthy();
      expect(builderState?.state?.roiAssumptions?.timeSavedMin).toBe(45);

      // Verify history
      expect(historyResult.current.historyLength).toBe(5);
      expect(historyResult.current.canUndo).toBe(true);

      syncHook.unmount();
    });

    it('should handle errors during save and allow retry', async () => {
      const store = useBuilderStore.getState();
      
      // Set minimal invalid state (no department and systemName)
      act(() => {
        store.setState({
          systemName: '',
          department: '',
        });
      });

      // Try to save - should not create system
      let saveError;
      try {
        await act(async () => {
          await store.save();
        });
      } catch (error) {
        saveError = error;
      }

      // Should not have created a system ID
      expect(store.systemId).toBeNull();

      // Now provide valid data
      act(() => {
        store.setState({
          systemName: 'Retry Test',
          department: 'Testing',
        });
      });

      // Retry save
      await act(async () => {
        await store.save();
      });

      // Should succeed now
      const systemId = store.systemId;
      expect(systemId).toBeTruthy();
      createdSystemIds.push(systemId!);

      const { data: system } = await supabase
        .from('agents')
        .select('*')
        .eq('id', systemId)
        .single();

      expect(system?.name).toBe('Retry Test');
    });
  });
});
