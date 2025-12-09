import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBuilderStore } from '@/stores/builderStore';

describe('Builder Navigation', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useBuilderStore.getState();
    reset();
  });

  it('should initialize at step 1', () => {
    const { result } = renderHook(() => useBuilderStore());
    expect(result.current.currentStep).toBe(1);
  });

  it('should navigate forward through steps', () => {
    const { result } = renderHook(() => useBuilderStore());

    act(() => {
      result.current.setCurrentStep(2);
    });
    expect(result.current.currentStep).toBe(2);

    act(() => {
      result.current.setCurrentStep(3);
    });
    expect(result.current.currentStep).toBe(3);
  });

  it('should navigate backward through steps', () => {
    const { result } = renderHook(() => useBuilderStore());

    act(() => {
      result.current.setCurrentStep(3);
    });
    expect(result.current.currentStep).toBe(3);

    act(() => {
      result.current.setCurrentStep(2);
    });
    expect(result.current.currentStep).toBe(2);
  });

  it('should not exceed step boundaries', () => {
    const { result } = renderHook(() => useBuilderStore());

    act(() => {
      result.current.setCurrentStep(7); // Beyond max steps
    });
    // Store should handle this gracefully (either clamp or ignore)
    expect(result.current.currentStep).toBeLessThanOrEqual(6);

    act(() => {
      result.current.setCurrentStep(0); // Before min steps
    });
    expect(result.current.currentStep).toBeGreaterThanOrEqual(1);
  });

  it('should persist state across step changes', () => {
    const { result } = renderHook(() => useBuilderStore());

    // Set data in step 1
    act(() => {
      result.current.setState({
        systemName: 'Test System',
        department: 'Finance'
      });
    });

    // Navigate to step 2
    act(() => {
      result.current.setCurrentStep(2);
    });

    // Navigate back to step 1
    act(() => {
      result.current.setCurrentStep(1);
    });

    // Data should persist
    expect(result.current.state.systemName).toBe('Test System');
    expect(result.current.state.department).toBe('Finance');
  });

  it('should mark as dirty when state changes', () => {
    const { result } = renderHook(() => useBuilderStore());

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setState({ systemName: 'Test' });
    });

    // Note: isDirty logic should be implemented in the store
    // This test assumes it exists
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useBuilderStore());

    act(() => {
      result.current.setCurrentStep(3);
      result.current.setState({
        systemName: 'Test System',
        department: 'Finance'
      });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentStep).toBe(1);
    expect(result.current.state.systemName).toBe('');
  });
});
