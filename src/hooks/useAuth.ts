import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services';
import type { User } from '@supabase/supabase-js';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSession() {
  return useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authService.getSession,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: session, isLoading: sessionLoading } = useSession();

  const signOut = useCallback(async () => {
    await authService.signOut();
    queryClient.setQueryData(['auth', 'user'], null);
    queryClient.setQueryData(['auth', 'session'], null);
  }, [queryClient]);

  return {
    user: user ?? null,
    session: session ?? null,
    isLoading: userLoading || sessionLoading,
    isAuthenticated: !!user && !!session,
    signOut,
  };
}

export function useAuthListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);
}
