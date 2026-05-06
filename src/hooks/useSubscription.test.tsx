import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscription } from './useSubscription';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should provide canUseFeature function', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.canUseFeature).toBe('function');
  });

  it('should provide canCreateSignature function', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.canCreateSignature).toBe('function');
  });

  it('should return false for feature check when data is undefined', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canUseFeature('digital_signatures_per_year')).toBe(false);
  });

  it('should return not allowed for signature creation when data is undefined', () => {
    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canCreateSignature().allowed).toBe(false);
  });
});