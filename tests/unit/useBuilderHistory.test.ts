import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuilderHistory } from '@/hooks/useBuilderHistory';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/stores/builderStore');
vi.mock('@/hooks/use-toast');

describe('useBuilderHistory', () => {
  const mockSetState = vi.fn();
  const mockToast = vi.fn();
  let currentState = { systemName: 'Initial', department: 'Eng' };

  beforeEach(() => {
    vi.clearAllMocks();
    currentState = { systemName: 'Initial', department: 'Eng' };

    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        setState: mockSetState,
        state: currentState,
      };
      return selector(state);
    });
  });

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useBuilderHistory());

    expect(result.current.historyLength).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should add entry to history', () => {
    const { result } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('Changed system name');
    });

    expect(result.current.historyLength).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should limit history to 50 entries', () => {
    const { result } = renderHook(() => useBuilderHistory());

    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.addToHistory(`Change ${i}`);
      }
    });

    expect(result.current.historyLength).toBe(50);
  });

  it('should undo to previous state', () => {
    const { result, rerender } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('First change');
    });

    currentState = { systemName: 'Updated', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Second change');
    });

    act(() => {
      result.current.undo();
    });

    expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({
      systemName: 'Initial',
      department: 'Eng',
    }));
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Undone',
      description: 'First change',
    });
  });

  it('should show toast when trying to undo at beginning', () => {
    const { result } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.undo();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Nothing to undo',
      description: "You're at the beginning of history",
    });
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('should redo to next state', () => {
    const { result, rerender } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('First change');
    });

    currentState = { systemName: 'Updated', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Second change');
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(mockSetState).toHaveBeenLastCalledWith(expect.objectContaining({
      systemName: 'Updated',
      department: 'Eng',
    }));
    expect(mockToast).toHaveBeenLastCalledWith({
      title: 'Redone',
      description: 'Second change',
    });
  });

  it('should show toast when trying to redo at end', () => {
    const { result } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('First change');
    });

    act(() => {
      result.current.redo();
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Nothing to redo',
      description: "You're at the latest version",
    });
  });

  it('should remove future history when adding entry in middle', () => {
    const { result, rerender } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('First');
    });

    currentState = { systemName: 'Second', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Second');
    });

    currentState = { systemName: 'Third', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Third');
    });

    expect(result.current.historyLength).toBe(3);

    // Undo twice
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    // Add new entry, should remove "Third"
    currentState = { systemName: 'Branch', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Branched');
    });

    expect(result.current.historyLength).toBe(2);
    expect(result.current.canRedo).toBe(false);
  });

  it('should handle state cloning errors gracefully', () => {
    const circularState = { name: 'Test' } as any;
    circularState.self = circularState;

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        setState: mockSetState,
        state: circularState,
      };
      return selector(state);
    });

    // Mock structuredClone to fail
    const originalStructuredClone = global.structuredClone;
    global.structuredClone = vi.fn(() => {
      throw new Error('Clone failed');
    });

    const { result } = renderHook(() => useBuilderHistory());

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      result.current.addToHistory('Test');
    });

    expect(result.current.historyLength).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to clone state for history');

    global.structuredClone = originalStructuredClone;
    consoleSpy.mockRestore();
  });

  it('should use JSON fallback when structuredClone fails', () => {
    const validState = { name: 'Test', value: 123 };

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        setState: mockSetState,
        state: validState,
      };
      return selector(state);
    });

    // Mock structuredClone to fail but JSON should work
    const originalStructuredClone = global.structuredClone;
    global.structuredClone = vi.fn(() => {
      throw new Error('Clone failed');
    });

    const { result } = renderHook(() => useBuilderHistory());

    act(() => {
      result.current.addToHistory('Test');
    });

    expect(result.current.historyLength).toBe(1);

    global.structuredClone = originalStructuredClone;
  });

  it('should maintain correct canUndo and canRedo state', () => {
    const { result, rerender } = renderHook(() => useBuilderHistory());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.addToHistory('First');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    currentState = { systemName: 'Second', department: 'Eng' };
    rerender();

    act(() => {
      result.current.addToHistory('Second');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });
});
