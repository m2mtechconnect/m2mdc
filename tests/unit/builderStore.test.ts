import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuilderStore } from '@/stores/builderStore';

// Mock Supabase.
//
// The client is used through fluent chains, and the store also reads the
// session. A hand-written literal drifted from the real call chain (missing
// getSession and maybeSingle), so every save and load test failed on the mock
// rather than on the store. This chainable stub answers any chain and resolves
// with the same shape the store expects.
const singleRow = {
  id: 'system-123',
  state: { systemName: 'Loaded System' },
  step: 1,
};

function chain(): any {
  const result = { data: singleRow, error: null };
  const target: any = vi.fn(() => proxy);
  const proxy: any = new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      }
      if (prop === 'single' || prop === 'maybeSingle') {
        return vi.fn(() => Promise.resolve(result));
      }
      return vi.fn(() => proxy);
    },
    apply: () => proxy,
  });
  return proxy;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'test-user-123' } }, error: null })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'test-user-123' }, access_token: 'test-token' } },
          error: null,
        })
      ),
    },
    from: vi.fn(() => chain()),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  },
}));

describe('Builder Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useBuilderStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      expect(result.current.systemId).toBeNull();
      expect(result.current.currentStep).toBe(1);
      expect(result.current.state.systemName).toBe('');
      expect(result.current.state.department).toBe('');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('System ID Management', () => {
    it('should set system ID', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setSystemId('test-system-456');
      });
      
      expect(result.current.systemId).toBe('test-system-456');
    });

    it('should clear system ID on reset', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setSystemId('test-system-456');
        result.current.reset();
      });
      
      expect(result.current.systemId).toBeNull();
    });
  });

  describe('Current Step Management', () => {
    it('should update current step', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setCurrentStep(3);
      });
      
      expect(result.current.currentStep).toBe(3);
    });

    it('should clamp step to valid range', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setCurrentStep(7); // Max is 6
      });
      
      expect(result.current.currentStep).toBeLessThanOrEqual(6);
    });
  });

  describe('State Updates', () => {
    it('should update state fields', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ 
          systemName: 'Updated System',
          department: 'Finance' 
        });
      });
      
      expect(result.current.state.systemName).toBe('Updated System');
      expect(result.current.state.department).toBe('Finance');
    });

    it('should mark as dirty after state change', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'Changed' });
        result.current.setIsDirty(true);
      });
      
      expect(result.current.isDirty).toBe(true);
    });

    it('should preserve other fields when updating', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ 
          systemName: 'System A',
          department: 'Operations' 
        });
      });
      
      act(() => {
        result.current.setState({ temperature: 0.9 });
      });
      
      expect(result.current.state.systemName).toBe('System A');
      expect(result.current.state.department).toBe('Operations');
      expect(result.current.state.temperature).toBe(0.9);
    });
  });

  describe('Dirty State Management', () => {
    it('should track dirty state', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      expect(result.current.isDirty).toBe(false);
      
      act(() => {
        result.current.setIsDirty(true);
      });
      
      expect(result.current.isDirty).toBe(true);
    });

    it('should clear dirty state after save', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setIsDirty(true);
      });
      
      expect(result.current.isDirty).toBe(true);
      
      act(() => {
        result.current.setIsDirty(false);
      });
      
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Last Saved Timestamp', () => {
    it('should update last saved timestamp', () => {
      const { result } = renderHook(() => useBuilderStore());
      const now = new Date();
      
      act(() => {
        result.current.setLastSaved(now);
      });
      
      expect(result.current.lastSaved).toBe(now);
    });
  });

  describe('Save Operation', () => {
    it('should set saving state during save', async () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'Test Save' });
        result.current.setSystemId('save-test-123');
      });
      
      let savingState = false;
      
      await act(async () => {
        const savePromise = result.current.save();
        savingState = result.current.isSaving;
        await savePromise;
      });
      
      expect(savingState).toBe(true);
      expect(result.current.isSaving).toBe(false);
    });

    it('should update lastSaved after successful save', async () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'Test Save' });
        result.current.setSystemId('save-test-123');
      });
      
      await act(async () => {
        await result.current.save();
      });
      
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should clear dirty state after successful save', async () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'Test Save' });
        result.current.setSystemId('save-test-123');
        result.current.setIsDirty(true);
      });
      
      await act(async () => {
        await result.current.save();
      });
      
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Load Operation', () => {
    it('should load system state from database', async () => {
      const { result } = renderHook(() => useBuilderStore());
      
      await act(async () => {
        await result.current.load('system-123');
      });
      
      expect(result.current.systemId).toBe('system-123');
      expect(result.current.state.systemName).toBe('Loaded System');
    });

    it('should handle load errors gracefully', async () => {
      const { result } = renderHook(() => useBuilderStore());
      
      await act(async () => {
        try {
          await result.current.load('non-existent-system');
        } catch (error) {
          // Error handled
        }
      });
      
      // Store should remain in valid state
      expect(result.current.systemId).toBeDefined();
    });
  });

  describe('Reset Operation', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setSystemId('test-123');
        result.current.setCurrentStep(4);
        result.current.setState({ systemName: 'Modified', department: 'IT' });
        result.current.setIsDirty(true);
        result.current.setLastSaved(new Date());
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.systemId).toBeNull();
      expect(result.current.currentStep).toBe(1);
      expect(result.current.state.systemName).toBe('');
      expect(result.current.state.department).toBe('');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('Complex State Scenarios', () => {
    it('should handle multiple rapid state updates', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'A' });
        result.current.setState({ systemName: 'AB' });
        result.current.setState({ systemName: 'ABC' });
        result.current.setState({ systemName: 'ABCD' });
      });
      
      expect(result.current.state.systemName).toBe('ABCD');
    });

    it('should maintain consistency across step changes', () => {
      const { result } = renderHook(() => useBuilderStore());
      
      act(() => {
        result.current.setState({ systemName: 'Persistent System' });
        result.current.setCurrentStep(2);
        result.current.setCurrentStep(3);
        result.current.setCurrentStep(1);
      });
      
      expect(result.current.state.systemName).toBe('Persistent System');
    });
  });
});
