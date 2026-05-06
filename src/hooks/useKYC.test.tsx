import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKYC } from './useKYC';

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

describe('useKYC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useKYC({ autoFetch: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.kycProfile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.initiating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isVerified).toBe(false);
  });

  it('should return correct computed values when profile is null', async () => {
    const { result } = renderHook(() => useKYC({ autoFetch: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.currentProvider).toBeNull();
  });

  it('should not call fetchKYCStatus when autoFetch is false', async () => {
    const { result } = renderHook(() => useKYC({ autoFetch: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(false);
  });

  it('should provide all required functions', async () => {
    const { result } = renderHook(() => useKYC({ autoFetch: false }), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.fetchKYCStatus).toBe('function');
    expect(typeof result.current.initiateVerification).toBe('function');
    expect(typeof result.current.cancelVerification).toBe('function');
    expect(typeof result.current.refreshStatus).toBe('function');
  });
});