/**
 * Blueprint Store Unit Tests
 * Tests for the main blueprint state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBlueprintStore } from '@/stores/blueprintStore';
import type { AgentBlueprint } from '@/types/agentBlueprint';

describe('Blueprint Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useBlueprintStore());
    act(() => {
      result.current.clearBlueprint();
    });
  });

  describe('Initial State', () => {
    it('should have null initial blueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      expect(result.current.currentBlueprint).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should report no blueprint via hasBlueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      expect(result.current.hasBlueprint()).toBe(false);
    });
  });

  describe('setBlueprint()', () => {
    it('should set a new blueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      const blueprint: AgentBlueprint = {
        id: 'test-bp-1',
        name: 'Test Blueprint',
        source: 'template',
        industry: 'technology',
        department: 'operations',
      } as AgentBlueprint;
      
      act(() => {
        result.current.setBlueprint(blueprint);
      });
      
      expect(result.current.currentBlueprint).toEqual(blueprint);
      expect(result.current.hasBlueprint()).toBe(true);
    });

    it('should reset dirty state when setting blueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.markDirty();
      });
      
      expect(result.current.isDirty).toBe(true);
      
      act(() => {
        result.current.setBlueprint({ name: 'New BP' } as AgentBlueprint);
      });
      
      expect(result.current.isDirty).toBe(false);
    });

    it('should update lastUpdated timestamp', () => {
      const { result } = renderHook(() => useBlueprintStore());
      const before = new Date();
      
      act(() => {
        result.current.setBlueprint({ name: 'Test' } as AgentBlueprint);
      });
      
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('updateBlueprint()', () => {
    it('should update partial blueprint fields', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({
          name: 'Original',
          industry: 'tech',
          department: 'ops',
        } as AgentBlueprint);
      });
      
      act(() => {
        result.current.updateBlueprint({ name: 'Updated' });
      });
      
      expect(result.current.currentBlueprint?.name).toBe('Updated');
      expect(result.current.currentBlueprint?.industry).toBe('tech');
      expect(result.current.currentBlueprint?.department).toBe('ops');
    });

    it('should mark as dirty after update', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Original' } as AgentBlueprint);
      });
      
      expect(result.current.isDirty).toBe(false);
      
      act(() => {
        result.current.updateBlueprint({ name: 'Updated' });
      });
      
      expect(result.current.isDirty).toBe(true);
    });

    it('should not update if no current blueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      act(() => {
        result.current.updateBlueprint({ name: 'Test' });
      });
      
      expect(result.current.currentBlueprint).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should deep merge nested objects', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({
          name: 'Test',
          model: { provider: 'openai', temperature: 0.7 },
          behavior: { style: 'formal', tone: 'professional' },
        } as AgentBlueprint);
      });
      
      act(() => {
        result.current.updateBlueprint({
          model: { temperature: 0.9 },
        } as Partial<AgentBlueprint>);
      });
      
      expect(result.current.currentBlueprint?.model?.provider).toBe('openai');
      expect(result.current.currentBlueprint?.model?.temperature).toBe(0.9);
    });
  });

  describe('clearBlueprint()', () => {
    it('should clear the current blueprint', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Test' } as AgentBlueprint);
      });
      
      expect(result.current.hasBlueprint()).toBe(true);
      
      act(() => {
        result.current.clearBlueprint();
      });
      
      expect(result.current.currentBlueprint).toBeNull();
      expect(result.current.hasBlueprint()).toBe(false);
    });

    it('should reset all state', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Test' } as AgentBlueprint);
        result.current.markDirty();
      });
      
      act(() => {
        result.current.clearBlueprint();
      });
      
      expect(result.current.isDirty).toBe(false);
      expect(result.current.lastUpdated).toBeNull();
    });
  });

  describe('Dirty State Management', () => {
    it('should mark as dirty', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      expect(result.current.isDirty).toBe(false);
      
      act(() => {
        result.current.markDirty();
      });
      
      expect(result.current.isDirty).toBe(true);
    });

    it('should mark as clean', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Test' } as AgentBlueprint);
        result.current.updateBlueprint({ name: 'Updated' });
      });
      
      expect(result.current.isDirty).toBe(true);
      
      act(() => {
        result.current.markClean();
      });
      
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should only persist currentBlueprint in storage', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Persistent BP' } as AgentBlueprint);
        result.current.markDirty();
      });
      
      // Get raw storage data
      const stored = localStorage.getItem('blueprint-storage');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.currentBlueprint).toBeDefined();
        // Dirty state should not be persisted
        expect(parsed.state.isDirty).toBeUndefined();
        expect(parsed.state.lastUpdated).toBeUndefined();
      }
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle rapid updates', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'Initial' } as AgentBlueprint);
      });
      
      act(() => {
        result.current.updateBlueprint({ name: 'Update 1' });
        result.current.updateBlueprint({ name: 'Update 2' });
        result.current.updateBlueprint({ name: 'Update 3' });
        result.current.updateBlueprint({ name: 'Final' });
      });
      
      expect(result.current.currentBlueprint?.name).toBe('Final');
    });

    it('should maintain state across multiple hooks', () => {
      const { result: hook1 } = renderHook(() => useBlueprintStore());
      const { result: hook2 } = renderHook(() => useBlueprintStore());
      
      act(() => {
        hook1.current.setBlueprint({ name: 'Shared' } as AgentBlueprint);
      });
      
      expect(hook2.current.currentBlueprint?.name).toBe('Shared');
    });

    it('should handle set/clear/set cycle', () => {
      const { result } = renderHook(() => useBlueprintStore());
      
      act(() => {
        result.current.setBlueprint({ name: 'First' } as AgentBlueprint);
      });
      
      act(() => {
        result.current.clearBlueprint();
      });
      
      act(() => {
        result.current.setBlueprint({ name: 'Second' } as AgentBlueprint);
      });
      
      expect(result.current.currentBlueprint?.name).toBe('Second');
      expect(result.current.isDirty).toBe(false);
    });
  });
});
