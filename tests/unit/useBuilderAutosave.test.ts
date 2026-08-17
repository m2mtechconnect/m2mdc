import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBuilderAutosave } from '@/hooks/useBuilderAutosave';
import { useBuilderStore } from '@/stores/builderStore';
import { useToast } from '@/hooks/use-toast';

vi.mock('@/stores/builderStore');
vi.mock('@/hooks/use-toast');

describe('useBuilderAutosave', () => {
  const mockSave = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    // shouldAdvanceTime lets testing-library's waitFor (which polls on real
    // timers) make progress while the debounce runs on fake timers.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] });
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: false,
        save: mockSave,
        state: { systemName: '', department: '' },
      };
      return selector(state);
    });
  });

  afterEach(() => {
    // resetAllMocks (not clearAllMocks) also drops queued mockRejectedValueOnce
    // implementations, which otherwise leak into the next test.
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('should not autosave when isDirty is false', async () => {
    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should not autosave when both systemName and department are empty', async () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: '', department: '' },
      };
      return selector(state);
    });

    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should autosave after 500ms debounce when isDirty and has systemName', async () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test System', department: '' },
      };
      return selector(state);
    });

    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  it('should autosave after 500ms debounce when isDirty and has department', async () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: '', department: 'Engineering' },
      };
      return selector(state);
    });

    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  it('should debounce rapid changes', async () => {
    const { rerender } = renderHook(() => useBuilderAutosave());

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'T', department: '' },
      };
      return selector(state);
    });
    rerender();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Te', department: '' },
      };
      return selector(state);
    });
    rerender();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test', department: '' },
      };
      return selector(state);
    });
    rerender();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error toast only once on autosave failure', async () => {
    const error = new Error('Network error');
    mockSave.mockRejectedValueOnce(error);

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test', department: '' },
      };
      return selector(state);
    });

    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Autosave failed',
        description: 'Network error',
        variant: 'destructive',
      });
    });

    // Second save fails but should not show toast
    mockSave.mockRejectedValueOnce(error);
    
    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle non-Error exceptions in autosave', async () => {
    mockSave.mockRejectedValueOnce('String error');

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test', department: '' },
      };
      return selector(state);
    });

    renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Autosave failed',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    });
  });

  it('should reset error flag on successful save after failure', async () => {
    mockSave.mockRejectedValueOnce(new Error('First error'));

    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test', department: '' },
      };
      return selector(state);
    });

    const { rerender } = renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1);
    });

    // Now save succeeds
    mockSave.mockResolvedValueOnce(undefined);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    // Another error should show toast again
    mockSave.mockRejectedValueOnce(new Error('Second error'));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup timer on unmount', async () => {
    vi.mocked(useBuilderStore).mockImplementation((selector: any) => {
      const state = {
        isDirty: true,
        save: mockSave,
        state: { systemName: 'Test', department: '' },
      };
      return selector(state);
    });

    const { unmount } = renderHook(() => useBuilderAutosave());

    act(() => {
      vi.advanceTimersByTime(300);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  describe('manualSave', () => {
    it('should save and show success toast on manual save', async () => {
      mockSave.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useBuilderAutosave());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.manualSave();
      });

      expect(saveResult).toBe(true);
      expect(mockSave).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Progress saved',
        description: 'Your changes have been saved successfully',
      });
    });

    it('should show error toast and return false on manual save failure', async () => {
      const error = new Error('Save failed');
      mockSave.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useBuilderAutosave());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.manualSave();
      });

      expect(saveResult).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save failed',
        description: 'Save failed',
        variant: 'destructive',
      });
    });

    it('should handle non-Error exceptions in manual save', async () => {
      mockSave.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useBuilderAutosave());

      let saveResult;
      await act(async () => {
        saveResult = await result.current.manualSave();
      });

      expect(saveResult).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save failed',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    });
  });
});
